import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const ROOT = process.cwd();
export const CASES_ROOT = path.join(ROOT, process.env.CASES_ROOT || 'cases');
export const CATALOG_PATH = path.join(
  ROOT,
  process.env.CATALOG_PATH || path.join('catalog', 'index.json')
);

export function posixJoin(...parts) {
  return parts.filter(Boolean).join('/').replace(/\/+/g, '/');
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

export function listDirectories(parentDir) {
  if (!dirExists(parentDir)) {
    return [];
  }

  return fs
    .readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
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

export function writeText(filePath, text) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, text, 'utf8');
}

export function firstMeaningfulLine(markdown) {
  return (
    markdown
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#')) || ''
  );
}

export function firstHeading(markdown) {
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('#'));
  return heading ? heading.replace(/^#+\s*/, '').trim() : '';
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
  const sourceDir = path.join(caseDir, 'source');
  const revisionsDir = path.join(caseDir, 'revisions');
  const packagesDir = path.join(caseDir, 'packages');

  return {
    caseDirName,
    caseDir,
    manifestPath: path.join(caseDir, 'manifest.json'),
    sourceDir,
    casePath: path.join(sourceDir, 'case.md'),
    revisionsDir,
    packagesDir,
    legacyCasePath: path.join(caseDir, 'case.md'),
    legacyEncodingPath: path.join(caseDir, 'encoding.json'),
    legacyReadingPath: path.join(caseDir, 'reading.md')
  };
}

export function getRevisionEncodingRecords(caseDirName) {
  const paths = getCaseArtifactPaths(caseDirName);
  const records = [];

  for (const revisionId of listDirectories(paths.revisionsDir)) {
    const revisionDir = path.join(paths.revisionsDir, revisionId);
    const encodingPath = path.join(revisionDir, 'encoding.json');
    if (fileExists(encodingPath)) {
      records.push({ revisionId, revisionDir, encodingPath });
    }
  }

  if (!records.length && fileExists(paths.legacyEncodingPath)) {
    records.push({
      revisionId: 'legacy_root',
      revisionDir: paths.caseDir,
      encodingPath: paths.legacyEncodingPath
    });
  }

  return records.sort((a, b) => a.revisionId.localeCompare(b.revisionId));
}

export function getSolveReadingRecords(caseDirName) {
  const paths = getCaseArtifactPaths(caseDirName);
  const records = [];

  for (const revisionId of listDirectories(paths.revisionsDir)) {
    const revisionDir = path.join(paths.revisionsDir, revisionId);
    const solvesDir = path.join(revisionDir, 'solves');

    for (const solveId of listDirectories(solvesDir)) {
      const solveDir = path.join(solvesDir, solveId);
      const solvePath = path.join(solveDir, 'solve.json');
      const readingPath = path.join(solveDir, 'reading.md');

      records.push({
        revisionId,
        solveId,
        solveDir,
        solvePath,
        readingPath,
        hasSolve: fileExists(solvePath),
        hasReading: fileExists(readingPath)
      });
    }
  }

  return records.sort((a, b) => {
    const revisionCompare = a.revisionId.localeCompare(b.revisionId);
    return revisionCompare !== 0 ? revisionCompare : a.solveId.localeCompare(b.solveId);
  });
}

export function discoverCaseFolders() {
  if (!dirExists(CASES_ROOT)) {
    return [];
  }

  return fs
    .readdirSync(CASES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .filter((caseDirName) => {
      const paths = getCaseArtifactPaths(caseDirName);
      return (
        fileExists(paths.manifestPath) ||
        fileExists(paths.casePath) ||
        dirExists(paths.revisionsDir) ||
        fileExists(paths.legacyCasePath) ||
        fileExists(paths.legacyEncodingPath) ||
        fileExists(paths.legacyReadingPath)
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
