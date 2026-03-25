#!/usr/bin/env node
import process from 'node:process';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-pages-artifact-verify.mjs [--repo <owner/repo>] [--run-id <id>] [--workflow <file>] [--head-sha <sha>] [--allow-in-progress]',
    '',
    'Examples:',
    '  node tools/js/gui-pages-artifact-verify.mjs',
    '  node tools/js/gui-pages-artifact-verify.mjs --workflow gui-deploy-verify.yml --head-sha <sha>',
    '  node tools/js/gui-pages-artifact-verify.mjs --run-id 123456789',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = {
    repo: process.env.GITHUB_REPOSITORY || 'CMDR-Kegaira-Ohaya/gfe-engine-exp',
    workflow: 'gui-deploy-verify.yml',
    runId: null,
    headSha: null,
    allowInProgress: false,
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

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN or GH_TOKEN is required for GitHub API verification.');
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gfe-gui-pages-artifact-verify',
  };
}

async function githubJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API request failed (${response.status}) for ${url}: ${text}`);
  }
  return response.json();
}

async function getPagesInfo(repo) {
  return githubJson(`https://api.github.com/repos/${repo}/pages`);
}

async function getPagesBuildInfo(repo) {
  try {
    return await githubJson(`https://api.github.com/repos/${repo}/pages/builds/latest`);
  } catch (error) {
    return { unavailable: true, error: error.message };
  }
}

async function getRunById(repo, runId) {
  return githubJson(`https://api.github.com/repos/${repo}/actions/runs/${runId}`);
}

async function listWorkflowRuns(repo, workflow) {
  return githubJson(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=20`);
}

async function listRunArtifacts(repo, runId) {
  return githubJson(`https://api.github.com/repos/${repo}/actions/runs/${runId}/artifacts?per_page=100`);
}

function selectRun(runs, headSha, allowInProgress) {
  const filtered = runs.filter((run) => {
    if (headSha && run.head_sha !== headSha) return false;
    if (allowInProgress) return true;
    return run.status === 'completed';
  });

  if (!filtered.length) return null;

  filtered.sort((a, b) => {
    const left = new Date(a.created_at).getTime();
    const right = new Date(b.created_at).getTime();
    return right - left;
  });

  return filtered[0];
}

function summarizeArtifacts(artifacts) {
  return artifacts.map((artifact) => ({
    id: artifact.id,
    name: artifact.name,
    expired: artifact.expired,
    size_in_bytes: artifact.size_in_bytes,
    created_at: artifact.created_at,
    expires_at: artifact.expires_at,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pages = await getPagesInfo(args.repo);
  const pagesBuild = await getPagesBuildInfo(args.repo);

  const run = args.runId
    ? await getRunById(args.repo, args.runId)
    : selectRun((await listWorkflowRuns(args.repo, args.workflow)).workflow_runs || [], args.headSha, args.allowInProgress);

  const artifactsPayload = run ? await listRunArtifacts(args.repo, run.id) : { artifacts: [] };
  const artifacts = summarizeArtifacts(artifactsPayload.artifacts || []);

  const warnings = [];
  const errors = [];

  if (!run) {
    warnings.push('No matching workflow run was found for the requested workflow/head SHA filter.');
  } else {
    if (!args.allowInProgress && run.status !== 'completed') {
      errors.push(`Selected workflow run is not completed (status=${run.status}).`);
    }
    if (run.status === 'completed' && run.conclusion !== 'success') {
      errors.push(`Selected workflow run did not succeed (conclusion=${run.conclusion}).`);
    }
    if (!artifacts.length) {
      warnings.push('Selected workflow run does not currently expose any uploaded artifacts.');
    }
  }

  if (pagesBuild?.unavailable) {
    warnings.push('Latest Pages build info is unavailable through the current API response.');
  }

  const result = {
    repo: args.repo,
    workflow: args.workflow,
    requested_run_id: args.runId,
    requested_head_sha: args.headSha,
    allow_in_progress: args.allowInProgress,
    pages: {
      status: pages.status || null,
      cname: pages.cname || null,
      custom_404: pages.custom_404 || false,
      html_url: pages.html_url || null,
      build_type: pages.build_type || null,
      source: pages.source || null,
      public: pages.public || false,
    },
    pages_build: pagesBuild,
    workflow_run: run
      ? {
          id: run.id,
          name: run.name,
          head_branch: run.head_branch,
          head_sha: run.head_sha,
          status: run.status,
          conclusion: run.conclusion,
          event: run.event,
          created_at: run.created_at,
          updated_at: run.updated_at,
          html_url: run.html_url,
        }
      : null,
    artifacts,
    warnings,
    errors,
    ok: errors.length === 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
