import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const ROOT = process.cwd();
export const CASES_ROOT = path.join(ROOT, process.env.CASES_ROOT || 'cases');
export const CATALOG_PATH = path.join(ROOT, process.env.CATALOG_PATH || path.join('catalog', 'index.json'));

export function posixJoin(...parts) {
  return parts.join('/').replace(/\/+/g, '/');
}

export function toRepoPath(absPath) {
  return posixJoin(...path.relative(ROOT, absPath).split(path.sep));
}

export function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

export function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function safeReadJson(filePath) {
  try {
    return { ok: true, data: readJson(filePath) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function firstMeaningfulLine(markdown) {
  return markdown
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#')) || '';
}

export function gitLastModifiedIso(repoRelativePath) {
  try {
    return execFileSync(
      'git',
      ['log', '-1', '--format=%aI', '--', repoRelativePath],
      { encoding: 'utf8' }
    ).trim();
  } catch {
    return '';
  }
}

export function getCaseArtifactPaths(caseDirName) {
  const caseDir = path.join(CASES_ROOT, caseDirName);
  return {
    caseDirName,
    caseDir,
    casePath: path.join(caseDir, 'case.md'),
    encodingPath: path.join(caseDir, 'encoding.json'),
    readingPath: path.join(caseDir, 'reading.md'),
    manifestPath: path.join(caseDir, 'manifest.json')
  };
}

export function discoverCaseFolders() {
  if (!dirExists(CASES_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(CASES_ROOT, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .filter(caseDirName => {
      const paths = getCaseArtifactPaths(caseDirName);
      return (
        fileExists(paths.manifestPath) ||
        fileExists(paths.encodingPath) ||
        fileExists(paths.casePath) ||
        fileExists(paths.readingPath)
      );
    })
    .sort((a, b) => a.localeCompare(b));
}

export function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function writeJson(filePath, data) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
