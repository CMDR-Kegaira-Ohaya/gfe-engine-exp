import fs from 'node:fs';
import path from 'node:path';
import {
  CASES_ROOT,
  dirExists,
  ensureParentDir,
  fileExists,
  firstHeading,
  getCaseArtifactPaths,
  listDirectories,
  readJson,
  readText,
  toRepoPath,
  writeJson,
  writeText
} from './common.mjs';

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function repoAbsolute(repoLikePath) {
  return path.resolve(process.cwd(), repoLikePath);
}

function copyFileIfPresent(sourcePath, targetPath, summary) {
  if (!fileExists(sourcePath)) {
    return false;
  }
  ensureParentDir(targetPath);
  fs.copyFileSync(sourcePath, targetPath);
  summary.changed.push(toRepoPath(targetPath));
  return true;
}

function copyDirectoryRecursive(sourceDir, targetDir, summary) {
  if (!dirExists(sourceDir)) {
    return false;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const fromPath = path.join(sourceDir, entry.name);
    const toPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(fromPath, toPath, summary);
    } else if (entry.isFile()) {
      ensureParentDir(toPath);
      fs.copyFileSync(fromPath, toPath);
      summary.changed.push(toRepoPath(toPath));
    }
  }

  return true;
}

const cli = parseArgs(process.argv);
const sourcePathInput = cli['source-path'] || process.env.SOURCE_PATH || '';
const targetSlug = cli['target-slug'] || process.env.TARGET_SLUG || '';
const caseId = cli['case-id'] || process.env.CASE_ID || '';
const mode = cli.mode || process.env.MODE || 'create';

if (!isNonEmptyString(sourcePathInput) || !isNonEmptyString(targetSlug) || !isNonEmptyString(caseId)) {
  console.error('[migrate-case] source_path, target_slug, and case_id are required.');
  process.exit(1);
}

if (!['create', 'update'].includes(mode)) {
  console.error(`[migrate-case] mode must be create or update, received ${mode}.`);
  process.exit(1);
}

const sourceDir = repoAbsolute(sourcePathInput);
if (!dirExists(sourceDir)) {
  console.error(`[migrate-case] Source folder does not exist: ${sourcePathInput}`);
  process.exit(1);
}

const targetPaths = getCaseArtifactPaths(targetSlug);
const targetExists = dirExists(targetPaths.caseDir);

if (mode === 'create' && targetExists) {
  console.error(`[migrate-case] Target already exists for create mode: ${toRepoPath(targetPaths.caseDir)}`);
  process.exit(1);
}

if (mode === 'update' && !targetExists) {
  console.error(`[migrate-case] Target does not exist for update mode: ${toRepoPath(targetPaths.caseDir)}`);
  process.exit(1);
}

const sourceManifestPath = path.join(sourceDir, 'manifest.json');
const sourceSourceCasePath = path.join(sourceDir, 'source', 'case.md');
const sourceLegacyCasePath = path.join(sourceDir, 'case.md');
const sourceRevisionsDir = path.join(sourceDir, 'revisions');
const sourcePackagesDir = path.join(sourceDir, 'packages');
const sourceLegacyEncodingPath = path.join(sourceDir, 'encoding.json');
const sourceLegacyReadingPath = path.join(sourceDir, 'reading.md');

const sourceManifest = fileExists(sourceManifestPath) ? readJson(sourceManifestPath) : null;
const sourceCasePath = fileExists(sourceSourceCasePath)
  ? sourceSourceCasePath
  : fileExists(sourceLegacyCasePath)
    ? sourceLegacyCasePath
    : '';

const summary = {
  source: toRepoPath(sourceDir),
  target: toRepoPath(targetPaths.caseDir),
  mode,
  changed: [],
  skipped: [],
  warnings: []
};

const titleFromSource = sourceManifest?.title ||
  (sourceCasePath ? firstHeading(readText(sourceCasePath)) : '') ||
  targetSlug;

const manifest = {
  case_id: caseId,
  title: titleFromSource,
  slug: targetSlug,
  current_case_source: './source/case.md'
};

writeJson(targetPaths.manifestPath, manifest);
summary.changed.push(toRepoPath(targetPaths.manifestPath));

if (sourceCasePath) {
  writeText(targetPaths.casePath, readText(sourceCasePath));
  summary.changed.push(toRepoPath(targetPaths.casePath));
} else {
  summary.warnings.push('No case source was found in the intake root.');
}

if (dirExists(sourceRevisionsDir)) {
  copyDirectoryRecursive(sourceRevisionsDir, targetPaths.revisionsDir, summary);
} else if (fileExists(sourceLegacyEncodingPath)) {
  const revisionId = 'rev_migrated_root';
  const targetEncodingPath = path.join(targetPaths.revisionsDir, revisionId, 'encoding.json');
  copyFileIfPresent(sourceLegacyEncodingPath, targetEncodingPath, summary);

  if (fileExists(sourceLegacyReadingPath)) {
    summary.warnings.push(
      'Legacy root reading.md was not promoted because no solve provenance was available. Preserve or migrate it manually later.'
    );
  }
}

if (dirExists(sourcePackagesDir)) {
  copyDirectoryRecursive(sourcePackagesDir, targetPaths.packagesDir, summary);
}

console.log(`[migrate-case] Source: ${summary.source}`);
console.log(`[migrate-case] Target: ${summary.target}`);
console.log(`[migrate-case] Mode: ${summary.mode}`);

for (const changed of summary.changed) {
  console.log(`[migrate-case] changed: ${changed}`);
}

for (const skipped of summary.skipped) {
  console.log(`[migrate-case] skipped: ${skipped}`);
}

for (const warning of summary.warnings) {
  console.warn(`[migrate-case] warning: ${warning}`);
}
