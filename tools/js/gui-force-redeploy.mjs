#!/usr/bin/env node
import process from 'node:process';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-force-redeploy.mjs [--repo <owner/repo>] [--workflow <file>] [--ref <branch>]',
    '',
    'Examples:',
    '  node tools/js/gui-force-redeploy.mjs',
    '  node tools/js/gui-force-redeploy.mjs --workflow gui-force-redeploy.yml --ref main',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    repo: process.env.GITHUB_REPOSITORY || 'CMDR-Kegaira-Ohaya/gfe-engine-exp',
    workflow: 'gui-force-redeploy.yml',
    ref: process.env.GITHUB_REF_NAME || 'main',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--repo') {
      args.repo = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--workflow') {
      args.workflow = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--ref') {
      args.ref = argv[index + 1];
      index += 1;
      continue;
    }
    if (['-h', '--help', 'help'].includes(token)) {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required for workflow dispatch.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gfe-gui-force-redeploy',
  };
}

async function dispatchWorkflow(repo, workflow, ref) {
  const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: githubHeaders(),
    body: JSON.stringify({ ref }),
  });

  if (response.status !== 204) {
    const text = await response.text();
    throw new Error(`Workflow dispatch failed (${response.status}) for ${workflow}: ${text}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await dispatchWorkflow(args.repo, args.workflow, args.ref);

  console.log(JSON.stringify({
    ok: true,
    repo: args.repo,
    workflow: args.workflow,
    ref: args.ref,
    dispatched: true,
    note: 'Workflow dispatch accepted. Inspect workflow runs to observe the resulting redeploy path.',
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
