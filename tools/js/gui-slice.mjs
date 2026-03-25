#!/usr/bin/env node
import process from 'node:process';
import * as walk from 'acorn-walk';
import {
  loadModule,
  locRange,
  renderCallee,
  normalizeRepoPath,
  relativeImportPath,
  collectPatternNames,
} from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-slice.mjs <file> <symbol>',
    '',
    'Example:',
    '  node tools/js/gui-slice.mjs ui-v3/app.js renderAtlas',
  ].join('\n'));
}

function findDeclaration(ast, symbol) {
  for (const node of ast.body) {
    const found = declarationInfo(node, symbol);
    if (found) return found;
  }
  return null;
}

function declarationInfo(node, symbol) {
  if (!node) return null;

  if (node.type === 'FunctionDeclaration' && node.id?.name === symbol) {
    return { node, kind: 'function', name: symbol, codeStart: node.start, codeEnd: node.end, ...locRange(node) };
  }

  if (node.type === 'ClassDeclaration' && node.id?.name === symbol) {
    return { node, kind: 'class', name: symbol, codeStart: node.start, codeEnd: node.end, ...locRange(node) };
  }

  if (node.type === 'VariableDeclaration') {
    for (const declarator of node.declarations) {
      if (collectPatternNames(declarator.id).includes(symbol)) {
        return { node, kind: 'variable', name: symbol, codeStart: node.start, codeEnd: node.end, ...locRange(node) };
      }
    }
  }

  if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
    return declarationInfo(node.declaration, symbol);
  }

  return null;
}

function collectExports(ast, symbol) {
  const matches = [];
  for (const node of ast.body) {
    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration && declarationInfo(node.declaration, symbol)) matches.push({ kind: 'declaration', ...locRange(node) });
      for (const specifier of node.specifiers || []) {
        if (specifier.local?.name === symbol || specifier.exported?.name === symbol) {
          matches.push({ kind: 'specifier', local: specifier.local?.name ?? null, exported: specifier.exported?.name ?? null, ...locRange(specifier) });
        }
      }
    }
    if (node.type === 'ExportDefaultDeclaration' && node.declaration?.id?.name === symbol) {
      matches.push({ kind: 'default-declaration', exported: 'default', ...locRange(node) });
    }
  }
  return matches;
}

function collectImports(ast, symbol) {
  const matches = [];
  for (const node of ast.body) {
    if (node.type !== 'ImportDeclaration') continue;
    const specs = node.specifiers.filter((specifier) => specifier.local?.name === symbol || specifier.imported?.name === symbol);
    if (!specs.length) continue;
    matches.push({
      source: node.source?.value ?? null,
      specifiers: specs.map((specifier) => ({
        kind: specifier.type,
        local: specifier.local?.name ?? null,
        imported: specifier.imported?.name ?? (specifier.type === 'ImportDefaultSpecifier' ? 'default' : specifier.type === 'ImportNamespaceSpecifier' ? '*' : null),
        ...locRange(specifier),
      })),
      ...locRange(node),
    });
  }
  return matches;
}

function collectDirectCallees(declarationNode) {
  const callees = [];
  walk.fullAncestor(declarationNode, (node, ancestors) => {
    if (node.type !== 'CallExpression') return;
    const innerFunction = ancestors.find((ancestor) => ancestor !== declarationNode && /Function(Expression|Declaration)$/.test(ancestor.type));
    if (innerFunction) return;
    callees.push({ callee: renderCallee(node.callee), arguments: node.arguments.length, ...locRange(node) });
  });
  return callees;
}

function collectCallers(ast, symbol) {
  const callers = [];
  walk.fullAncestor(ast, (node, ancestors) => {
    if (node.type !== 'CallExpression') return;
    if (node.callee?.type !== 'Identifier' || node.callee.name !== symbol) return;
    const enclosing = [...ancestors].reverse().find((ancestor) => /Function(Expression|Declaration)$/.test(ancestor.type) || ancestor.type === 'Program');
    callers.push({ caller: enclosing?.type === 'Program' ? '<top-level>' : enclosing?.id?.name ?? '<anonymous>', callee: symbol, ...locRange(node) });
  });
  return callers;
}

async function main() {
  const [, , fileArg, symbol] = process.argv;
  if (!fileArg || !symbol) {
    usage();
    process.exit(1);
  }

  const file = normalizeRepoPath(fileArg);
  const moduleInfo = await loadModule(file);
  const declaration = findDeclaration(moduleInfo.ast, symbol);

  console.log(JSON.stringify({
    file,
    symbol,
    declaration: declaration ? { kind: declaration.kind, name: declaration.name, start: declaration.start, end: declaration.end } : null,
    code: declaration ? moduleInfo.text.slice(declaration.codeStart, declaration.codeEnd) : null,
    direct_callees: declaration ? collectDirectCallees(declaration.node) : [],
    direct_callers: collectCallers(moduleInfo.ast, symbol),
    imports: collectImports(moduleInfo.ast, symbol),
    exports: collectExports(moduleInfo.ast, symbol),
    suggested_moves: declaration ? { extracted_module_hint: relativeImportPath(file, file.replace(/\.js$/, `.${symbol}.js`)) } : null,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
