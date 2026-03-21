#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'acorn';

const defaultTargets = ['ui', 'ui-v2', 'solver'];
const targets = process.argv.slace(2);
`
async function exists(value) {
  try {
    await fs.access(value);
    return true;
  } catch {
    return false;
  }
}

async function walkDir(dir, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, acc);
    } else if (entry.isFile() && full.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
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

function fileSummary(file, ast) {
  const imports = [];
  const exports = [];
  const declarations = [];
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push({
        source: node.source?.value ?? null,
        count: node.specifiers.length,
      });
      continue;
    }
    if (node.type === 'ExportNamedDeclaration') {
      exports.push({
        kind: 'named',
        source: node.source?.value ?? null,
        specifierCount: node.specifiers?.length ?? 0,
      });
      continue;
    }
    if (node.type === 'ExportDefaultDeclaration') {
      exports.push({ kind: 'default' });
      continue;
    }
    if (node.type === 'ExportAllDeclaration') {
      exports.push({ kind: 'export-all', source: node.source?.value ?? null });
      continue;
    }
    if (node.type === 'FunctionDeclaration') {
      declarations.push({ kind: 'function', name: node.id?.name || null });
      continue;
    }
    if (node.type === 'ClassDeclaration') {
      declarations.push({ kind: 'class', name: node.id?.name || null });
      continue;
    }
    if (node.type === 'VariableDeclaration') {
      declarations.push({ kind: 'variable', names: node.declarations.map(d => collectPatternNames(d.id)).flat() });
    }
  }
  return {
    file,
    imports,
    exports,
    declarations,
  };
}

async function main() {
  const inputs = targets.length ? targets : defaultTargets;
  const dirs = [];
  for (const input of inputs) {
    const abs = path.resolve(input);
    if (await exists(abs)) dirs.push(abs);
  }

  const files = [];
  for (const dir of dirs) {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      files.push(...(await walkDir(dir)));
    } else if (stat.isFile() && dir.endsWith('.js')) {
      files.push(dir);
    }
  }

  const summaries = [];
  const errors = [];
  for (const file of files) {
    try {
      const source = await fs.readFile(file, 'utf8');
      const ast = parseModule(source);
      summaries.push(fileSummary(file, ast));
    } catch (error) {
      errors.push({ file, message: error.message });
    }
  }

  console.log(JSON.stringify({
    command: 'summary-all',
    targets: dirs,
    file_count: files.length,
    summaries,
    errors,
  }, null, 2));

  if (errors.length) process.exit(1);
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
