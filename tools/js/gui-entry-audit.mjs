#!/usr/bin/env node
import process from 'node:process';
import {
  readText,
  parseHtmlAssets,
  buildModuleGraph,
  normalizeRepoPath,
} from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-entry-audit.mjs <html-file>',
    '',
    'Example:',
    '  node tools/js/gui-entry-audit.mjs workbench-v3.html',
  ].join('\n'));
}

function countLiteral(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
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

  const warnings = [];
  const appNode = graph.nodeMap['ui-v3/app.js'];
  const rendererNode = graph.nodeMap['ui-v3/atlas-renderer.js'];

  if (appNode?.text && rendererNode?.text) {
    const appCalls = countLiteral(appNode.text, /\benhanceAtlasMap\s*\(/g);
    const rendererCalls = countLiteral(rendererNode.text, /\benhanceAtlasMap\s*\(/g);
    if (appCalls && rendererCalls) {
      warnings.push({
        kind: 'duplicate-atlas-enhancement-ownership',
        app_calls: appCalls,
        renderer_calls: rendererCalls,
        detail: 'enhanceAtlasMap is still called from both app.js and atlas-renderer.js',
      });
    }
  }

  graph.missingImports.forEach((missing) => warnings.push({ kind: 'missing-import', ...missing }));

  console.log(JSON.stringify({
    html: htmlFile,
    stylesheets: assets.stylesheets,
    module_scripts: assets.moduleScripts,
    entry_modules: entryModules,
    module_graph: {
      nodes: Object.keys(graph.nodeMap).sort(),
      edges: graph.edges,
    },
    warnings,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
