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

function hasLiteral(text, pattern) {
  return pattern.test(text);
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
  const rendererNode = graph.nodeMap['ui-v3/atlas-renderer.js'];
  const coreNode = graph.nodeMap['ui-v3/atlas-renderer-core.js'];

  Object.values(graph.nodeMap).forEach((node) => {
    if (!node.text) return;

    const staleEnhancerImport = countLiteral(node.text, /atlas-map-enhancer\.js/g);
    const staleEnhancerCall = countLiteral(node.text, /\benhanceAtlasMap\s*\(/g);

    if (staleEnhancerImport || staleEnhancerCall) {
      warnings.push({
        kind: 'stale-enhancer-reference',
        file: node.file,
        import_hits: staleEnhancerImport,
        call_hits: staleEnhancerCall,
        detail: 'atlas-map-enhancer.js and enhanceAtlasMap() should no longer appear in the canonical Workbench v3 runtime path.',
      });
    }
  });

  if (coreNode?.text) {
    if (!hasLiteral(coreNode.text, /function\s+renderAtlasMapShell\s*\(/)) {
      warnings.push({
        kind: 'core-shell-scaffolding-missing',
        file: 'ui-v3/atlas-renderer-core.js',
        detail: 'atlas map shell scaffolding is expected to live directly in atlas-renderer-core.js.',
      });
    }
  }

  if (rendererNode?.text) {
    if (!hasLiteral(rendererNode.text, /function\s+wireAtlasMap\s*\(/)) {
      warnings.push({
        kind: 'renderer-map-wiring-missing',
        file: 'ui-v3/atlas-renderer.js',
        detail: 'atlas map interaction wiring is expected to live directly in atlas-renderer.js.',
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
