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

function hasDeclaration(text, symbol) {
  return new RegExp(`function\\s+${symbol}\\s*\\(`).test(text);
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

  Object.values(graph.nodeMap).forEach((node) => {
    if (!node.text) return;

    if (/atlas-map-enhancer\.js/.test(node.text)) {
      issues.push({
        severity: 'error',
        kind: 'deleted-enhancer-import-reference',
        file: node.file,
        detail: 'atlas-map-enhancer.js should not be referenced after enhancer removal.',
      });
    }

    if (hasCall(node.text, 'enhanceAtlasMap')) {
      issues.push({
        severity: 'error',
        kind: 'deleted-enhancer-call-reference',
        file: node.file,
        detail: 'enhanceAtlasMap() should not be called after enhancer removal.',
      });
    }
  });

  const rendererNode = graph.nodeMap['ui-v3/atlas-renderer.js'];
  if (!rendererNode?.text) {
    issues.push({
      severity: 'error',
      kind: 'missing-renderer-node',
      file: 'ui-v3/atlas-renderer.js',
      detail: 'The canonical Workbench v3 renderer module must be reachable from the live entry path.',
    });
  } else {
    if (!hasDeclaration(rendererNode.text, 'ensureAtlasMapShells')) {
      issues.push({
        severity: 'error',
        kind: 'missing-renderer-shell-scaffolding',
        file: 'ui-v3/atlas-renderer.js',
        detail: 'Renderer-owned atlas shell scaffolding is missing.',
      });
    }

    if (!hasDeclaration(rendererNode.text, 'wireAtlasMap')) {
      issues.push({
        severity: 'error',
        kind: 'missing-renderer-map-wiring',
        file: 'ui-v3/atlas-renderer.js',
        detail: 'Renderer-owned atlas map interaction wiring is missing.',
      });
    }
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
