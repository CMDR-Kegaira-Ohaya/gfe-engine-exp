import path from 'node:path';
import {
  CATALOG_PATH,
  discoverCaseFolders,
  fileExists,
  firstHeading,
  firstMeaningfulLine,
  getCaseArtifactPaths,
  getRevisionEncodingRecords,
  getSolveReadingRecords,
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
    console.warn(
      `[build-catalog] Skipping ${caseDirName}: manifest.json could not be parsed (${error instanceof Error ? error.message : String(error)}).`
    );
    continue;
  }

  const casePath = fileExists(paths.casePath)
    ? paths.casePath
    : fileExists(paths.legacyCasePath)
      ? paths.legacyCasePath
      : '';
  const encodingRecords = getRevisionEncodingRecords(caseDirName);
  const solveRecords = getSolveReadingRecords(caseDirName);

  const hasCase = Boolean(casePath);
  const hasEncoding = encodingRecords.length > 0;
  const hasReading = solveRecords.some((record) => record.hasReading) || fileExists(paths.legacyReadingPath);

  let participants = 0;
  let timesteps = 0;
  let systemName = '';
  let caseIdFromEncoding = '';
  let latestEncodingPath = '';

  if (encodingRecords.length) {
    latestEncodingPath = encodingRecords[0].encodingPath;
    try {
      const encoding = readJson(latestEncodingPath);
      participants = Array.isArray(encoding.participants) ? encoding.participants.length : 0;
      timesteps = Array.isArray(encoding.timeline) ? encoding.timeline.length : 0;
      systemName = typeof encoding.system_name === 'string' ? encoding.system_name : '';
      caseIdFromEncoding = typeof encoding.case_id === 'string' ? encoding.case_id : '';
    } catch (error) {
      console.warn(
        `[build-catalog] ${caseDirName}: encoding metadata extraction failed (${error instanceof Error ? error.message : String(error)}).`
      );
    }
  }

  let synopsis = '';
  if (hasCase) {
    try {
      const caseText = readText(casePath);
      synopsis = firstMeaningfulLine(caseText).slice(0, 200) || firstHeading(caseText).slice(0, 200);
    } catch (error) {
      console.warn(
        `[build-catalog] ${caseDirName}: case synopsis extraction failed (${error instanceof Error ? error.message : String(error)}).`
      );
    }
  }

  const caseRepoDir = toRepoPath(paths.caseDir);

  const currentCasePath = manifest.current_case_source
    ? path.join(paths.caseDir, manifest.current_case_source.replace(/^\.\//, ''))
    : casePath;

  entries.push({
    case_id: manifest.case_id || caseIdFromEncoding || caseDirName,
    title: manifest.title || systemName || caseDirName,
    slug: manifest.slug || caseDirName,
    has_case: hasCase,
    has_encoding: hasEncoding,
    has_reading: hasReading,
    revision_count: encodingRecords.length,
    reading_count: solveRecords.filter((record) => record.hasReading).length,
    participants,
    timesteps,
    modified: gitLastModifiedIso(caseRepoDir),
    synopsis,
    paths: {
      case: hasCase ? `/${toRepoPath(currentCasePath || casePath)}` : '',
      manifest: `/${toRepoPath(paths.manifestPath)}`,
      encoding: latestEncodingPath ? `/${toRepoPath(latestEncodingPath)}` : '',
      reading: ''
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

console.log(
  `[build-catalog] Wrote ${entries.length} case entr${entries.length === 1 ? 'y' : 'ies'} to ${toRepoPath(CATALOG_PATH)}.`
);
