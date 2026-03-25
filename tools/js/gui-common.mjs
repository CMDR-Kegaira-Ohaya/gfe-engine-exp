#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { parse } from 'acorn';
import * as walk from 'acorn-walk';

export const repoRoot = process.cwd();

export function normalizeRepoPath(value) {
  return String(value || '').split(path.sep).join('/').replace(/^\.\//, '');
}

export function repoToAbs(filePath) {
  return path.resolve(repoRoot, filePath);
}

export function absToRepo(absPath) {
  return normalizeRepoPath(path.relative(repoRoot, absPath) || '.');
}

export async function pathExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath) {
  const absPath = repoToAbs(filePath);
  const text = await fs.readFile(absPath, 'utf8');
  return { file: absToRepo(absPath), absPath, text };
}

export function parseModule(source) {
  return parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
    allowHashBang: true,
    allowAwaitOutsideFunction: true,
  });
}

export async function loadModule(filePath) {
  const moduleInfo = await readText(filePath);
  return {
    ...moduleInfo,
    ast: parseModule(moduleInfo.text),
  };
}

export function locRange(node) {
  return {
    start: node?.loc?.start ?? null,
    end: node?.loc?.end ?? null,
  };
}

export function simpleName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal') return String(node.value);
  return null;
}

export function collectPatternNames(pattern) {
  if (!pattern) return [];
  if (pattern.type === 'Identifier') return [pattern.name];
  if (pattern.type === 'ObjectPattern') {
    return pattern.properties.flatMap((property) => {
      if (property.type === 'Property') return collectPatternNames(property.value);
      if (property.type === 'RestElement') return collectPatternNames(property.argument);
      return [];
    });
  }
  if (pattern.type === 'ArrayPattern') {
    return pattern.elements.flatMap((element) => collectPatternNames(element));
  }
  if (pattern.type === 'RestElement') return collectPatternNames(pattern.argument);
  if (pattern.type === 'AssignmentPattern') return collectPatternNames(pattern.left);
  return [];
}

export function renderCallee(node) {
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

export function normalizeVisibleText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

export function looksLikeUserVisibleText(text) {
  const normalized = normalizeVisibleText(text);
  if (normalized.length < 4) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (/^(?:\.|#|\/|@)/.test(normalized) && !/\s/.test(normalized)) return false;
  if (/^[a-z0-9_-]+$/i.test(normalized) && !/\s/.test(normalized) && normalized.length < 20) return false;
  return /[\s:,.!?()]/.test(normalized) || /^[A-Z]/.test(normalized);
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function relativeImportPath(fromFile, toFile) {
  const relativePath = normalizeRepoPath(path.relative(path.dirname(repoToAbs(fromFile)), repoToAbs(toFile)));
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
}

export async function resolveImportInfo(fromFile, specifier) {
  if (!specifier) return { specifier, local: false, resolved: null, exists: null, attempted: null };
  if (!specifier.startsWith('.')) return { specifier, local: false, resolved: null, exists: null, attempted: null };

  const importerDir = path.dirname(repoToAbs(fromFile));
  const basePath = path.resolve(importerDir, specifier);
  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.json`,
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.mjs'),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return {
        specifier,
        local: true,
        resolved: absToRepo(candidate),
        exists: true,
        attempted: absToRepo(candidate),
      };
    }
  }

  return {
    specifier,
    local: true,
    resolved: null,
    exists: false,
    attempted: absToRepo(basePath),
  };
}

export async function collectModuleDependencies(moduleInfo) {
  const dependencies = [];

  for (const node of moduleInfo.ast.body) {
    if (node.type === 'ImportDeclaration') {
      const resolution = await resolveImportInfo(moduleInfo.file, node.source?.value ?? null);
      dependencies.push({
        kind: 'import',
        source: node.source?.value ?? null,
        specifiers: node.specifiers.map((specifier) => ({
          kind: specifier.type,
          imported: specifier.type === 'ImportSpecifier' ? simpleName(specifier.imported) : specifier.type === 'ImportDefaultSpecifier' ? 'default' : '*',
          local: simpleName(specifier.local),
        })),
        ...resolution,
        ...locRange(node),
      });
      continue;
    }

    if (node.type === 'ExportAllDeclaration' || (node.type === 'ExportNamedDeclaration' && node.source)) {
      const resolution = await resolveImportInfo(moduleInfo.file, node.source?.value ?? null);
      dependencies.push({
        kind: 're-export',
        source: node.source?.value ?? null,
        specifiers: node.specifiers?.map((specifier) => ({
          local: simpleName(specifier.local),
          exported: simpleName(specifier.exported),
        })) ?? [],
        ...resolution,
        ...locRange(node),
      });
    }
  }

  return dependencies;
}

export async function buildModuleGraph(entryFiles) {
  const queue = unique(entryFiles.map(normalizeRepoPath));
  const nodeMap = {};
  const edges = [];
  const missingImports = [];

  while (queue.length) {
    const file = queue.shift();
    if (!file || nodeMap[file]) continue;

    try {
      const moduleInfo = await loadModule(file);
      const dependencies = await collectModuleDependencies(moduleInfo);
      nodeMap[file] = {
        file,
        text: moduleInfo.text,
        dependencies,
      };

      dependencies.forEach((dependency) => {
        edges.push({
          from: file,
          to: dependency.resolved ?? dependency.source,
          kind: dependency.kind,
          exists: dependency.exists !== false,
        });

        if (dependency.local && dependency.exists === false) {
          missingImports.push({
            file,
            source: dependency.source,
            attempted: dependency.attempted,
            kind: dependency.kind,
          });
        }

        if (dependency.resolved && /\.(?:[cm]?js)$/.test(dependency.resolved) && !nodeMap[dependency.resolved]) {
          queue.push(dependency.resolved);
        }
      });
    } catch (error) {
      nodeMap[file] = {
        file,
        text: null,
        dependencies: [],
        error: error.message,
      };
    }
  }

  return {
    entryFiles: unique(entryFiles.map(normalizeRepoPath)),
    nodeMap,
    edges,
    missingImports,
  };
}

export async function listFilesRecursive(targets, extensions = []) {
  const results = [];

  async function visit(target) {
    const absPath = repoToAbs(target);
    const stats = await fs.stat(absPath);

    if (stats.isDirectory()) {
      const entries = await fs.readdir(absPath, { withFileTypes: true });
      for (const entry of entries) {
        await visit(path.join(target, entry.name));
      }
      return;
    }

    const normalized = absToRepo(absPath);
    if (!extensions.length || extensions.some((extension) => normalized.endsWith(extension))) {
      results.push(normalized);
    }
  }

  for (const target of targets) {
    await visit(target);
  }

  return unique(results).sort();
}

export function parseHtmlAssets(htmlFile, htmlText) {
  const stylesheets = [];
  const moduleScripts = [];
  const htmlDir = path.dirname(repoToAbs(htmlFile));

  const stylesheetPattern = /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const moduleScriptPattern = /<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;

  for (const match of htmlText.matchAll(stylesheetPattern)) {
    const href = match[1];
    const local = href.startsWith('.');
    const resolved = local ? absToRepo(path.resolve(htmlDir, href)) : null;
    stylesheets.push({ href, local, resolved });
  }

  for (const match of htmlText.matchAll(moduleScriptPattern)) {
    const src = match[1];
    const local = src.startsWith('.');
    const resolved = local ? absToRepo(path.resolve(htmlDir, src)) : null;
    moduleScripts.push({ src, local, resolved });
  }

  return { stylesheets, moduleScripts };
}

export function extractJsUserVisibleStrings(source) {
  const ast = parseModule(source);
  const results = [];

  walk.full(ast, (node) => {
    if (node.type === 'Literal' && typeof node.value === 'string') {
      const text = normalizeVisibleText(node.value);
      if (looksLikeUserVisibleText(text)) results.push({ text, ...locRange(node) });
      return;
    }

    if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
      const text = normalizeVisibleText(node.quasis.map((quasi) => quasi.value.cooked).join(''));
      if (looksLikeUserVisibleText(text)) results.push({ text, ...locRange(node) });
    }
  });

  return results;
}

export function extractHtmlVisibleText(source) {
  const withoutBlocks = source
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');

  const results = [];
  for (const match of withoutBlocks.matchAll(/>([^<]+)</g)) {
    const text = normalizeVisibleText(match[1]);
    if (looksLikeUserVisibleText(text)) results.push({ text });
  }
  return results;
}
