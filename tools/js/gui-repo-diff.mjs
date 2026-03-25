#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const GUI_SCOPE_PREFIXES = [
  'workbench-v3.html',
  'ui-v3/',
  'tools/js/gui-',
  '.github/workflows/gui-',
  'package.json',
];

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-repo-diff.mjs [--base-ref <ref>] [--head-ref <ref>]',
    '',
    'Examples:',
    '  node tools/js/gui-repo-diff.mjs',
    '  node tools/js/gui-repo-diff.mjs --base-ref HEAD~3 --head-ref HEAD',
  ].join('\n'));
}

function parseArgs(argv) {
  const args = { baseRef: 'HEAD~1', headRef: 'HEAD' };

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
    if (['-h', '--help', 'help'].includes(token)) {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function runGit(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function isGuiScope(path) {
  return GUI_SCOPE_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

function classifyPath(path) {
  if (path === 'workbench-v3.html') return 'shell';
  if (path.startsWith('ui-v3/atlas-renderer')) return 'renderer';
  if (path.startsWith('ui-v3/atlas-map-enhancer')) return 'enhancer';
  if (path === 'ui-v3/app.js') return 'app-runtime';
  if (path.startsWith('ui-v3/') && path.endsWith('.css')) return 'css-surface';
  if (path.startsWith('ui-v3/')) return 'ui-module';
  if (path.startsWith('tools/js/gui-')) return 'gui-tooling';
  if (path.startsWith('.github/workflows/gui-')) return 'gui-workflow';
  if (path === 'package.json') return 'tool-deps';
  return 'other';
}

function parseNameStatus(baseRef, headRef) {
  const raw = runGit(['diff', '--name-status', '--find-renames', `${baseRef}..${headRef}`]);
  if (!raw) return [];

  return raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const parts = line.split('\t');
    const status = parts[0];
    const previousPath = status.startsWith('R') ? parts[1] : null;
    const path = status.startsWith('R') ? parts[2] : parts[1];
    return {
      status,
      path,
      previous_path: previousPath,
      in_gui_scope: isGuiScope(path) || (previousPath ? isGuiScope(previousPath) : false),
      classification: classifyPath(path),
    };
  });
}

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolvedBase = runGit(['rev-parse', args.baseRef]);
  const resolvedHead = runGit(['rev-parse', args.headRef]);
  const files = parseNameStatus(args.baseRef, args.headRef);
  const inScope = files.filter((entry) => entry.in_gui_scope);
  const outOfScope = files.filter((entry) => !entry.in_gui_scope);

  const result = {
    base_ref: args.baseRef,
    head_ref: args.headRef,
    resolved_base: resolvedBase,
    resolved_head: resolvedHead,
    commit_range: `${resolvedBase}..${resolvedHead}`,
    changed_files: files,
    gui_scope: {
      changed_count: inScope.length,
      files: inScope,
      by_classification: countBy(inScope, (entry) => entry.classification),
    },
    out_of_scope: {
      changed_count: outOfScope.length,
      files: outOfScope,
      by_classification: countBy(outOfScope, (entry) => entry.classification),
    },
    notes: [
      'GUI scope includes workbench-v3.html, ui-v3/, tools/js/gui-*, .github/workflows/gui-*, and package.json.',
      'Out-of-scope drift is not automatically wrong, but it should be explained during GUI-focused work.',
    ],
    ok: true,
  };

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
}
