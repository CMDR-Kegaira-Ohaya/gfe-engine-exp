import path from 'node:path';
import {
  CATALOG_PATH,
  discoverCaseFolders,
  fileExists,
  firstMeaningfulLine,
  getCaseArtifactPaths,
  gitLastModifiedIso,
  readJson,
  readText,
  toRepoPath,
  writeJson
} from './common.mjs';

const branch = process.argv[2] || process.env.GITHUB_REF_NAME || 'unknown';
const caseFolders = discoverCaseFolders();
const entries = [];

for (const caseDirName of caseFolders) {
  const paths = getCaseArtifactPaths(caseDirName);

  if (!fileExists(paths.manifestPath)) {
    console.warn(`[build-catalog] Skipping ${caseDirName}: manifest.json is missing.`);
    continue;
  }

  let manifest;
  try {
    manifest = readJson(paths.manifestPath);
  } catch (error) {
    console.warn(`[build-catalog] Skipping ${caseDirName}: manifest.json could not be parsed (${error instanceof Error ? error.message : String(error)}).`);
    continue;
  }

  const hasCase = fileExists(paths.casePath);
  const hasEncoding = fileExists(paths.encodingPath);
  const hasReading = fileExists(paths.readingPath);

  let participants = 0;
  let timesteps = 0;
  let systemName = '';
  let caseIdFromEncoding = '';

  if (hasEncoding) {
    try {
      const encoding = readJson(paths.encodingPath);
      participants = Array.isArray(encoding.participants) ? encoding.participants.length : 0;
      timesteps = Array.isArray(encoding.timeline) ? encoding.timeline.length : 0;
      systemName = typeof encoding.system_name === 'string' ? encoding.system_name : '';
      caseIdFromEncoding = typeof encoding.case_id === 'string' ? encoding.case_id : '';
    } catch (error) {
      console.warn(`[build-catalog] ${caseDirName}: encoding.json metadata extraction failed (${error instanceof Error ? error.message : String(error)}).`);
    }
  }

  let synopsis = '';
  if (hasCase) {
    try {
      synopsis = firstMeaningfulLine(readText(paths.casePath)).slice(0, 200);
    } catch (error) {
      console.warn(`[build-catalog] ${caseDirName}: case.md synopsis extraction failed (${error instanceof Error ? error.message : String(error)}).`);
    }
  }

  const caseRepoDir = toRepoPath(paths.caseDir);

  entries.push({
    case_id: manifest.case_id || caseIdFromEncoding || caseDirName,
    title: manifest.title || systemName || caseDirName,
    slug: caseDirName,
    has_case: hasCase,
    has_encoding: hasEncoding,
    has_reading: hasReading,
    participants,
    timesteps,
    modified: gitLastModifiedIso(caseRepoDir),
    synopsis,
    paths: {
      case: hasCase ? `/${toRepoPath(paths.casePath)}` : '',
      encoding: hasEncoding ? `/${toRepoPath(paths.encodingPath)}` : '',
      reading: hasReading ? `/${toRepoPath(paths.readingPath)}` : '',
      manifest: `/${toRepoPath(paths.manifestPath)}`
    }
  });
}

entries.sort((a, b) => a.slug.localeCompare(b.slug));

writeJson(CATALOG_PATH, {
  branch,
  generated_at: new Date().toISOString(),
  count: entries.length,
  cases: entries
});

console.log(`[build-catalog] Wrote ${entries.length} case entr${entries.length === 1 ? 'y' : 'ies'} to ${toRepoPath(CATALOG_PATH)}.`);
