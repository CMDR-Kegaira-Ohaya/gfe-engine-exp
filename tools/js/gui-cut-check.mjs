#!/usr/bin/env node
import process from 'node:process';
import { readText, parseHtmlAssets, buildModuleGraph, normalizeRepoPath, pathExists, repoToAbs } from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-cut-check.mjs <html-file>',
    '',
    'Example:',
    '  node tools/js/gui-cut-check.mjs workbench-v3.html',
  ].join('\n'));
}

function hasCall(text, symbol) {
  return new RegExp(`\\b${symbol}\\s*\\(`).test(text);
}

async function main() {
  const [, , htmlArg] = process.argv;
  if (!htmlArg) {
    usage();
    process.exit(1);
  }

  const htmlFile = normalizeRepoPath(htmlArg);
  const htmlInfo = await readText(htmlFile);
  const assets = parseHtmlAssets(htmlFile, htmlInfo.text);
  const entryModules = assets.moduleScripts.filter((asset) => asset.resolved).map((asset) => asset.resolved);
  const graph = await buildModuleGraph(entryModules);

  const issues = [];

  for (const asset of assets.stylesheets) {
    if (asset.local && !(await pathExists(repoToAbs(asset.resolved)))) {
      issues.push({ severity: 'error', kind: 'missing-stylesheet', file: htmlFile, href: asset.href, resolved: asset.resolved });
    }
  }

  graph.missingImports.forEach((missing) => issues.push({ severity: 'error', kind: 'missing-import', ...missing }));

  const allNodes = Object.values(graph.nodeMap);
  allNodes.forEach((node) => {
    if (!node.text) return;
    if (node.file !== 'ui-v3/atlas-renderer.js' && hasCall(node.text, 'enhanceAtlasMap')) {
      issues.push({ severity: 'warn', kind: 'enhancer-call-outside-renderer', file: node.file });
    }
  });

  const appNode = graph.nodeMap['ui-v3/app.js'];
  const rendererNode = graph.nodeMap['ui-v3/atlas-renderer.js'];
  if (appNode?.text && rendererNode?.text && hasCall(appNode.text, 'enhanceAtlasMap') && hasCall(rendererNode.text, 'enhanceAtlasMap')) {
    issues.push({ severity: 'warn', kind: 'duplicate-enhancer-ownership', files: ['ui-v3/app.js', 'ui-v3/atlas-renderer.js'] });
  }

  console.log(JSON.stringify({
    html: htmlFile,
    entry_modules: entryModules,
    issues,
    ok: !issues.some((issue) => issue.severity === 'error'),
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
