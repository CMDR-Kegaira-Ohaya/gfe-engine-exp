#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';

const [, , command, ...args] = process.argv;

function usage() {
  const lines = [
    'Usage:',
    '  node tools/js/parse.mjs check <file>',
    '  node tools/js/parse.mjs ast <file>',
    '  node tools/js/parse.mjs symbols <file>',
    '  node tools/js/parse.mjs deps <file>',
    '',
    'Commands:',
    '  check    Run node --check and report syntax status.',
    '  ast      Parse with Acorn and print full AST JSON.',
    '  symbols  Print compact import/export/function/class summary.',
    '  deps     Print import/export dependency edges.',
  ];
  console.error(lines.join('\n'));
}

async function readSource(filePath) {
  const absolutePath = path.resolve(filePath);
  const source = await fs.readFile(absolutePath, 'utf8');
  return { absolutePath, source };
}

function parseModule(source) {
  return parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    allowHashBang: true,
    allowAwaitOutsideFunction: true,
  });
}

function locRange(node) {
  return {
    start: node.loc?.start ?? null,
    end: node.loc?.end ?? null,
  };
}

function simpleName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  return null;
}

function collectPatternNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === 'Identifier') return [pattern.name];
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap(property => {
      if (property.type === 'Property') return collectPatternNames(property.value);
      if (property.type === 'RestElement') return collectPatternNames(property.argument);
      return [];
    });
  }
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap(element => collectPatternNames(element));
  }
  if (pattern.type === 'RestElement') return collectPatternNames(pattern.argument);
  if (pattern.type === 'AssignmentPattern') return collectPatternNames(pattern.left);
  return [];
}

function declarationSummary(node) {
  if (!node) return null;

  if (node.type === 'FunctionDeclaration') {
    return {
      kind: 'function',
      name: simpleName(node.id),
      async: !!node.async,
      generator: !!node.generator,
      params: node.params.length,
      ...locRange(node),
    };
  }

  if (node.type === 'ClassDeclaration') {
    return {
      kind: 'class',
      name: simpleName(node.id),
      superClass: simpleName(node.superClass),
      ...locRange(node),
    };
  }

  if (node.type === 'VariableDeclaration') {
    return {
      kind: 'variable',
      declarationKind: node.kind,
      names: node.declarations.map(declarator => collectPatternNames(declarator.id)).flat(),
      ...locRange(node),
    };
  }

  return null;
}

function renderCallee(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    const object = renderCallee(node.object);
    const property = node.computed ? `[${renderCallee(node.property)}]` : renderCallee(node.property);
    return `${object}.${property}`;
  }
  if (node.type === 'ThisExpression') return 'this';
  if (node.type === 'Super') return 'super';
  return node.type;
}

function callSummary(node) {
  return {
    callee: renderCallee(node.callee),
    arguments: node.arguments.length,
    ...locRange(node),
  };
}

function collectSymbols(ast) {
  const summary = { imports: [], exports: [], declarations: [], top_level_calls: [] };

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      summary.imports.push({
        source: node.source?.value ?? null,
        specifiers: node.specifiers.map(specifier => ({
          kind: specifier.type,
          imported: specifier.type === 'ImportSpecifier' ? simpleName(specifier.imported) : specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*',
          local: simpleName(specifier.local),
        })),
        ...locRange(node),
      });
      continue;
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        summary.exports.push({ kind: 'named-declaration', declaration: declarationSummary(node.declaration), source: node.source?.value ?? null, ...locRange(node) });
      } else {
        summary.exports.push({
          kind: 'named-specifiers',
          source: node.source?.value ?? null,
          specifiers: node.specifiers.map(specifier => ({ local: simpleName(specifier.local), exported: simpleName(specifier.exported) })),
          ...locRange(node),
        });
      }
      continue;
    }

    if (node.type === 'ExportDefaultDeclaration') {
      summary.exports.push({ kind: 'default', declaration: declarationSummary(node.declaration), ...locRange(node) });
      continue;
    }

    if (node.type === 'ExportAllDeclaration') {
      summary.exports.push({ kind: 'export-all', source: node.source?.value ?? null, exported: simpleName(node.exported), ...locRange(node) });
      continue;
    }

    const declaration = declarationSummary(node);
    if (declaration) {
      summary.declarations.push(declaration);
      continue;
    }

    if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
      summary.top_level_calls.push(callSummary(node.expression));
    }
  }

  return summary;
}

function dependencyGraph(ast, filePath) {
  const edges = [];
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      edges.push({ type: 'import', from: filePath, to: node.source?.value ?? null, ...locRange(node) });
    } else if (node.type === 'ExportAllDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
      edges.push({ type: 're-export', from: filePath, to: node.source?.value ?? null, ...locRange(node) });
    }
  }
  return edges;
}

async function runNodeCheck(filePath) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, ['--check', filePath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += String(chunk); });
    child.stderr.on('data', chunk => { stderr += String(chunk); });
    child.on('close', code => {
      resolve({ ok: code === 0, code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function main() {
  if (!command || ['-h', '--help', 'help'].includes(command)) {
    usage();
    process.exit(command ? 0 : 1);
  }

  const filePath = args[0];
  if (!filePath) {
    usage();
    process.exit(1);
  }

  const { absolutePath, source } = await readSource(filePath);

  if (command === 'check') {
    const result = await runNodeCheck(absolutePath);
    console.log(JSON.stringify({ command: 'check', file: absolutePath, ...result }, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  let ast;
  try {
    ast = parseModule(source);
  } catch (error) {
    console.error(JSON.stringify({
      command,
      file: absolutePath,
      ok: false,
      parser: 'acorn',
      error: { message: error.message, pos: error.pos ?? null, loc: error.loc ?? null },
    }, null, 2));
    process.exit(1);
  }

  if (command === 'ast') {
    console.log(JSON.stringify(ast, null, 2));
    return;
  }

  if (command === 'symbols') {
    console.log(JSON.stringify({ command: 'symbols', file: absolutePath, summary: collectSymbols(ast) }, null, 2));
    return;
  }

  if (command === 'deps') {
    console.log(JSON.stringify({ command: 'deps', file: absolutePath, edges: dependencyGraph(ast, absolutePath) }, null, 2));
    return;
  }

  if (command === 'find') {
    const needle = args[1];
    if (!needle) {
      usage();
      process.exit(1);
    }
    const matches = [];
    walk.fullAncestor(ast, (node, ancestors) => {
      if (node.type === 'Identifier' && node.name === needle) {
        matches.push({ name: node.name, parentType: ancestors.at(-2)?.type ?? null, ...locRange(node) });
      }
    });
    console.log(JSON.stringify({ command: 'find', file: absolutePath, needle, matches }, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: { message: error.message, stack: error.stack } }, null, 2));
  process.exit(1);
});
