#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-validate-chain.mjs [--base-ref <ref>] [--head-ref <ref>] [--pages-verify] [--copy-scan] [--run-id <id>] [--head-sha <sha>] [--allow-in-progress]',
    '',
    'Examples:',
    '  node tools/js/gui-validate-chain.mjs --base-ref HEAD~1 --head-ref HEAD',
    '  node tools/js/gui-validate-chain.mjs --pages-verify --head-sha <sha> --copy-scan',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    baseRef: 'HEAD~1',
    headRef: 'HEAD',
    pagesVerify: false,
    copyScan: false,
    runId: null,
    headSha: null,
    allowInProgress: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--base-ref') {
      args.baseRef = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--head-ref') {
      args.headRef = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--run-id') {
      args.runId = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--head-sha') {
      args.headSha = argv[index + 1];
      index += 1;
      continue;
    }
    if (token === '--pages-verify') {
      args.pagesVerify = true;
      continue;
    }
    if (token === '--copy-scan') {
      args.copyScan = true;
      continue;
    }
    if (token === '--allow-in-progress') {
      args.allowInProgress = true;
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

async function runJsonTool(script, scriptArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      const text = stdout.trim() || stderr.trim();
      try {
        const parsed = text ? JSON.parse(text) : { ok: code === 0 };
        resolve({ code, parsed, stdout: stdout.trim(), stderr: stderr.trim() });
      } catch (error) {
        reject(new Error(`Could not parse JSON output from ${script}: ${text || error.message}`));
      }
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const steps = [];
  const warnings = [];
  const errors = [];

  const entryAudit = await runJsonTool('tools/js/gui-entry-audit.mjs', ['workbench-v3.html']);
  steps.push({ step: 'entry-audit', ok: entryAudit.code === 0, result: entryAudit.parsed });
  (entryAudit.parsed.warnings || []).forEach((warning) => warnings.push({ step: 'entry-audit', detail: warning }));

  const cutCheck = await runJsonTool('tools/js/gui-cut-check.mjs', ['workbench-v3.html']);
  steps.push({ step: 'cut-check', ok: cutCheck.code === 0 && cutCheck.parsed.ok !== false, result: cutCheck.parsed });
  (cutCheck.parsed.issues || []).forEach((issue) => {
    if (issue.severity === 'error') errors.push({ step: 'cut-check', detail: issue });
    else warnings.push({ step: 'cut-check', detail: issue });
  });

  const liveSmoke = await runJsonTool('tools/js/gui-live-smoke.mjs', ['workbench-v3.html']);
  steps.push({ step: 'live-smoke', ok: liveSmoke.code === 0 && liveSmoke.parsed.ok !== false, result: liveSmoke.parsed });
  (liveSmoke.parsed.errors || []).forEach((issue) => errors.push({ step: 'live-smoke', detail: issue }));
  (liveSmoke.parsed.console_errors || []).forEach((issue) => warnings.push({ step: 'live-smoke', detail: issue }));
  (liveSmoke.parsed.missing_dom_targets || []).forEach((issue) => errors.push({ step: 'live-smoke', detail: { kind: 'missing-dom-target', target: issue } }));

  const repoDiff = await runJsonTool('tools/js/gui-repo-diff.mjs', ['--base-ref', args.baseRef, '--head-ref', args.headRef]);
  steps.push({ step: 'repo-diff', ok: repoDiff.code === 0, result: repoDiff.parsed });
  if ((repoDiff.parsed.out_of_scope?.changed_count || 0) > 0) {
    warnings.push({
      step: 'repo-diff',
      detail: {
        kind: 'out-of-scope-drift',
        changed_count: repoDiff.parsed.out_of_scope.changed_count,
        files: repoDiff.parsed.out_of_scope.files,
      },
    });
  }

  if (args.copyScan) {
    const copyScan = await runJsonTool('tools/js/gui-copy-scan.mjs', ['workbench-v3.html', 'ui-v3']);
    steps.push({ step: 'copy-scan', ok: copyScan.code === 0, result: copyScan.parsed });
    if ((copyScan.parsed.duplicate_clusters || []).length) {
      warnings.push({
        step: 'copy-scan',
        detail: {
          kind: 'duplicate-copy-clusters',
          cluster_count: copyScan.parsed.duplicate_clusters.length,
        },
      });
    }
  }

  if (args.pagesVerify) {
    const pagesArgs = [];
    if (args.runId) pagesArgs.push('--run-id', args.runId);
    if (args.headSha) pagesArgs.push('--head-sha', args.headSha);
    if (args.allowInProgress) pagesArgs.push('--allow-in-progress');
    const pagesVerify = await runJsonTool('tools/js/gui-pages-artifact-verify.mjs', pagesArgs);
    steps.push({ step: 'pages-artifact-verify', ok: pagesVerify.code === 0 && pagesVerify.parsed.ok !== false, result: pagesVerify.parsed });
    (pagesVerify.parsed.warnings || []).forEach((warning) => warnings.push({ step: 'pages-artifact-verify', detail: warning }));
    (pagesVerify.parsed.errors || []).forEach((issue) => errors.push({ step: 'pages-artifact-verify', detail: issue }));
  }

  const result = {
    base_ref: args.baseRef,
    head_ref: args.headRef,
    pages_verify: args.pagesVerify,
    copy_scan: args.copyScan,
    run_id: args.runId,
    head_sha: args.headSha,
    allow_in_progress: args.allowInProgress,
    steps,
    warnings,
    errors,
    ok: errors.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
