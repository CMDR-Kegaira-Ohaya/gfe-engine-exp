#!/usr/bin/env node
import process from 'node:process';
import * as walk from 'acorn-walk';
import {
  loadModule,
  listFilesRecursive,
  normalizeRepoPath,
  relativeImportPath,
  collectPatternNames,
  locRange,
} from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-symbol-move.mjs <symbol> <from-file> <to-file> [scan-root]',
    '',
    'Example:',
    '  node tools/js/gui-symbol-move.mjs enhanceAtlasMap ui-v3/atlas-map-enhancer.js ui-v3/atlas-renderer.js ui-v3',
  ].join('\n'));
}

function declaresSymbol(ast, symbol) {
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === symbol) return { kind: 'function', ...locRange(node) };
    if (node.type === 'ClassDeclaration' && node.id?.name === symbol) return { kind: 'class', ...locRange(node) };
    if (node.type === 'VariableDeclaration') {
      for (const declarator of node.declarations) {
        if (collectPatternNames(declarator.id).includes(symbol)) return { kind: 'variable', ...locRange(declarator) };
      }
    }
    if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') && node.declaration) {
      const nested = declaresSymbol({ body: [node.declaration] }, symbol);
      if (nested) return nested;
    }
  }
  return null;
}

function importSites(ast, symbol) {
  const matches = [];
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const matching = node.specifiers.filter((specifier) => specifier.local?.name === symbol || specifier.imported?.name === symbol);
    if (!matching.length) continue;
    matches.push({ source: node.source?.value ?? null, ...locRange(node) });
  }
  return matches;
}

function exportSites(ast, symbol) {
  const matches = [];
  for (const node of ast.body) {
    if (node.type !== 'ExportNamedDeclaration') continue;
    for (const specifier of node.specifiers || []) {
      if (specifier.local?.name === symbol || specifier.exported?.name === symbol) {
        matches.push({ kind: 'specifier', ...locRange(specifier) });
      }
    }
    if (node.declaration && declaresSymbol({ body: [node.declaration] }, symbol)) {
      matches.push({ kind: 'declaration', ...locRange(node) });
    }
  }
  return matches;
}

function callSites(ast, symbol) {
  const matches = [];
  walk.fullAncestor(ast, (node, ancestors) => {
    if (node.type !== 'CallExpression') return;
    if (node.callee?.type !== 'Identifier' || node.callee.name !== symbol) return;
    const owner = [...ancestors].reverse().find((ancestor) => /Function(Expression|Declaration)$/.test(ancestor.type) || ancestor.type === 'Program');
    matches.push({ inside: owner?.type === 'Program' ? '<top-level>' : owner?.id?.name ?? '<anonymous>', ...locRange(node) });
  });
  return matches;
}

async function inspectFile(file, symbol) {
  const moduleInfo = await loadModule(file);
  return {
    file,
    declaration: declaresSymbol(moduleInfo.ast, symbol),
    imports: importSites(moduleInfo.ast, symbol),
    exports: exportSites(moduleInfo.ast, symbol),
    calls: callSites(moduleInfo.ast, symbol),
  };
}

async function main() {
  const [, , symbol, fromArg, toArg, scanRootArg = 'ui-v3'] = process.argv;
  if (!symbol || !fromArg || !toArg) {
    usage();
    process.exit(1);
  }

  const fromFile = normalizeRepoPath(fromArg);
  const toFile = normalizeRepoPath(toArg);
  const scanRoot = normalizeRepoPath(scanRootArg);

  const from = await inspectFile(fromFile, symbol);
  const to = await inspectFile(toFile, symbol);
  const files = await listFilesRecursive([scanRoot], ['.js', '.mjs']);

  const impactedFiles = [];
  for (const file of files) {
    if (file === fromFile || file === toFile) continue;
    const inspected = await inspectFile(file, symbol);
    if (inspected.imports.length || inspected.calls.length || inspected.exports.length || inspected.declaration) {
      impactedFiles.push(inspected);
    }
  }

  const movePlan = [];

  if (!to.declaration && !to.imports.length) {
    movePlan.push({
      step: 'add-symbol-to-target',
      file: toFile,
      detail: `Add ${symbol} to ${toFile} or import it there first.`,
      suggested_import_from_source: relativeImportPath(toFile, fromFile),
    });
  }

  if (from.declaration || from.imports.length || from.calls.length || from.exports.length) {
    movePlan.push({
      step: 'remove-source-ownership',
      file: fromFile,
      detail: `Remove ${symbol} ownership from ${fromFile} after consumers are retargeted.`,
    });
  }

  impactedFiles.forEach((entry) => {
    movePlan.push({
      step: 'retarget-dependent-file',
      file: entry.file,
      detail: `Update ${symbol} dependency in ${entry.file} if it still resolves through ${fromFile}.`,
      suggested_import_to_target: relativeImportPath(entry.file, toFile),
    });
  });

  console.log(JSON.stringify({
    symbol,
    from,
    to,
    impacted_files: impactedFiles,
    move_plan: movePlan,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
