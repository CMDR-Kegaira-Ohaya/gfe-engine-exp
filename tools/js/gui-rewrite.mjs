#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';
import * as walk from 'acorn-walk';
import { loadModule, normalizeRepoPath, repoToAbs } from './gui-common.mjs';

function usage() {
  console.error([
    'Usage:',
    '  node tools/js/gui-rewrite.mjs retarget-import <file> <from-specifier> <to-specifier>',
    '  node tools/js/gui-rewrite.mjs remove-import-symbol <file> <source> <symbol>',
    '  node tools/js/gui-rewrite.mjs remove-call <file> <symbol> [--all]',
    '',
    'Examples:',
    '  node tools/js/gui-rewrite.mjs retarget-import ui-v3/app.js ./atlas-renderer.js ./atlas-renderer-core.js',
    '  node tools/js/gui-rewrite.mjs remove-import-symbol ui-v3/app.js ./atlas-map-enhancer.js enhanceAtlasMap',
    '  node tools/js/gui-rewrite.mjs remove-call ui-v3/app.js enhanceAtlasMap',
  ].join('\n'));
}

function applyEdits(text, edits) {
  return edits
    .slice()
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce((current, edit) => current.slice(0, edit.start) + edit.replacement + current.slice(edit.end), text);
}

function stringifySpecifier(specifier) {
  if (specifier.type === 'ImportDefaultSpecifier') return specifier.local.name;
  if (specifier.type === 'ImportNamespaceSpecifier') return `* as ${specifier.local.name}`;
  if (specifier.type === 'ImportSpecifier') {
    return specifier.imported.name === specifier.local.name
      ? specifier.local.name
      : `${specifier.imported.name} as ${specifier.local.name}`;
  }
  return null;
}

function renderImportDeclaration(source, retainedSpecifiers) {
  const defaultSpecifier = retainedSpecifiers.find((specifier) => specifier.type === 'ImportDefaultSpecifier');
  const namespaceSpecifier = retainedSpecifiers.find((specifier) => specifier.type === 'ImportNamespaceSpecifier');
  const namedSpecifiers = retainedSpecifiers.filter((specifier) => specifier.type === 'ImportSpecifier');

  const parts = [];
  if (defaultSpecifier) parts.push(defaultSpecifier.local.name);
  if (namespaceSpecifier) parts.push(`* as ${namespaceSpecifier.local.name}`);
  if (namedSpecifiers.length) parts.push(`{ ${namedSpecifiers.map(stringifySpecifier).join(', ')} }`);

  if (!parts.length) return '';
  return `import ${parts.join(', ')} from ${JSON.stringify(source)};`;
}

function expandRemovalRange(text, start, end) {
  let nextEnd = end;
  while (nextEnd < text.length && (text[nextEnd] === '\n' || text[nextEnd] === '\r')) nextEnd += 1;
  return { start, end: nextEnd };
}

async function writeText(file, text) {
  await fs.writeFile(repoToAbs(file), text, 'utf8');
}

async function retargetImport(file, fromSpecifier, toSpecifier) {
  const moduleInfo = await loadModule(file);
  const edits = moduleInfo.ast.body
    .filter((node) => node.type === 'ImportDeclaration' && node.source?.value === fromSpecifier)
    .map((node) => ({
      start: node.source.start,
      end: node.source.end,
      replacement: JSON.stringify(toSpecifier),
    }));

  if (!edits.length) throw new Error(`No import from ${fromSpecifier} found in ${file}.`);
  const nextText = applyEdits(moduleInfo.text, edits);
  await writeText(file, nextText);
  return { command: 'retarget-import', file, from: fromSpecifier, to: toSpecifier, rewritten_imports: edits.length };
}

async function removeImportSymbol(file, source, symbol) {
  const moduleInfo = await loadModule(file);
  const node = moduleInfo.ast.body.find(
    (entry) =>
      entry.type === 'ImportDeclaration' &&
      entry.source?.value === source &&
      entry.specifiers.some((specifier) => specifier.local?.name === symbol || specifier.imported?.name === symbol),
  );

  if (!node) throw new Error(`No import of ${symbol} from ${source} found in ${file}.`);

  const retainedSpecifiers = node.specifiers.filter(
    (specifier) => !(specifier.local?.name === symbol || specifier.imported?.name === symbol),
  );

  const replacement = renderImportDeclaration(source, retainedSpecifiers);
  const range = replacement ? { start: node.start, end: node.end } : expandRemovalRange(moduleInfo.text, node.start, node.end);
  const nextText = applyEdits(moduleInfo.text, [{ ...range, replacement }]);

  await writeText(file, nextText);
  return {
    command: 'remove-import-symbol',
    file,
    source,
    symbol,
    removed_entire_import: !replacement,
    remaining_specifiers: retainedSpecifiers.map(stringifySpecifier).filter(Boolean),
  };
}

async function removeCall(file, symbol, removeAll = false) {
  const moduleInfo = await loadModule(file);
  const matches = [];

  walk.fullAncestor(moduleInfo.ast, (node, ancestors) => {
    if (node.type !== 'ExpressionStatement') return;
    if (node.expression?.type !== 'CallExpression') return;
    if (node.expression.callee?.type !== 'Identifier' || node.expression.callee.name !== symbol) return;

    const parent = ancestors.at(-2);
    matches.push({
      start: node.start,
      end: node.end,
      parentType: parent?.type ?? null,
    });
  });

  if (!matches.length) throw new Error(`No standalone ${symbol}(...) call found in ${file}.`);

  const targets = removeAll ? matches : [matches[0]];
  const edits = targets.map((match) => ({ ...expandRemovalRange(moduleInfo.text, match.start, match.end), replacement: '' }));
  const nextText = applyEdits(moduleInfo.text, edits);
  await writeText(file, nextText);

  return {
    command: 'remove-call',
    file,
    symbol,
    removed_calls: targets.length,
    remove_all: removeAll,
  };
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || ['-h', '--help', 'help'].includes(command)) {
    usage();
    process.exit(command ? 0 : 1);
  }

  if (command === 'retarget-import') {
    const [fileArg, fromSpecifier, toSpecifier] = args;
    if (!fileArg || !fromSpecifier || !toSpecifier) {
      usage();
      process.exit(1);
    }
    const result = await retargetImport(normalizeRepoPath(fileArg), fromSpecifier, toSpecifier);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'remove-import-symbol') {
    const [fileArg, source, symbol] = args;
    if (!fileArg || !source || !symbol) {
      usage();
      process.exit(1);
    }
    const result = await removeImportSymbol(normalizeRepoPath(fileArg), source, symbol);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'remove-call') {
    const [fileArg, symbol, ...rest] = args;
    if (!fileArg || !symbol) {
      usage();
      process.exit(1);
    }
    const result = await removeCall(normalizeRepoPath(fileArg), symbol, rest.includes('--all'));
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
