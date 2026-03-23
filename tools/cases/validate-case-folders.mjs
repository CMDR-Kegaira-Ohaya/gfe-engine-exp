import {
  dirExists,
  discoverCaseFolders,
  fileExists,
  getCaseArtifactPaths,
  getRevisionEncodingRecords,
  getSolveReadingRecords,
  safeReadJson
} from './common.mjs';

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const caseFolders = discoverCaseFolders();

if (!caseFolders.length) {
  console.log('[validate-case-folders] No canonical case folders found under /cases.');
  process.exit(0);
}

let totalErrors = 0;
let totalWarnings = 0;

for (const caseDirName of caseFolders) {
  const paths = getCaseArtifactPaths(caseDirName);
  const errors = [];
  const warnings = [];

  const hasSourceCase = fileExists(paths.casePath);
  const hasLegacyCase = fileExists(paths.legacyCasePath);
  const encodingRecords = getRevisionEncodingRecords(caseDirName);
  const solveRecords = getSolveReadingRecords(caseDirName);

  if (!fileExists(paths.manifestPath)) {
    errors.push('manifest.json is required.');
  }

  let manifest = null;
  if (fileExists(paths.manifestPath)) {
    const parsed = safeReadJson(paths.manifestPath);
    if (!parsed.ok) {
      errors.push(`manifest.json could not be parsed: ${parsed.error}`);
    } else {
      manifest = parsed.data;
    }
  }

  if (!hasSourceCase && !hasLegacyCase) {
    warnings.push('No case source was found. Canonical source/case.md is preferred.');
  }

  if (hasLegacyCase && !hasSourceCase) {
    warnings.push('Legacy root case.md is present. Migrate it to source/case.md.');
  }

  if (fileExists(paths.legacyEncodingPath) && !dirExists(paths.revisionsDir)) {
    warnings.push('Legacy root encoding.json is present. Migrate it under revisions/<case_revision_id>/encoding.json.');
  }

  if (fileExists(paths.legacyReadingPath)) {
    warnings.push('Legacy root reading.md is present. Reading artifacts should live under revisions/<case_revision_id>/solves/<solve_id>/.');
  }

  if (manifest) {
    if (!isNonEmptyString(manifest.case_id)) {
      errors.push('manifest.case_id must be a non-empty string.');
    }

    if (!isNonEmptyString(manifest.title)) {
      errors.push('manifest.title must be a non-empty string.');
    }

    if (!isNonEmptyString(manifest.slug)) {
      errors.push('manifest.slug must be a non-empty string.');
    } else if (manifest.slug !== caseDirName) {
      errors.push(`manifest.slug (${manifest.slug}) does not match folder name (${caseDirName}).`);
    }

    if (!isNonEmptyString(manifest.current_case_source)) {
      errors.push('manifest.current_case_source must be a non-empty string.');
    } else if (!['./source/case.md', './case.md'].includes(manifest.current_case_source)) {
      warnings.push(`manifest.current_case_source (${manifest.current_case_source}) is unusual. Preferred value is ./source/case.md.`);
    }
  }

  for (const record of encodingRecords) {
    if (!isNonEmptyString(record.revisionId)) {
      errors.push('Each revision folder with encoding.json must have a non-empty revision folder name.');
    }
  }

  for (const record of solveRecords) {
    if (!record.hasSolve && !record.hasReading) {
      warnings.push(`Solve folder ${record.revisionId}/${record.solveId} contains neither solve.json nor reading.md.`);
    }
    if (!record.hasSolve && record.hasReading) {
      warnings.push(`Solve folder ${record.revisionId}/${record.solveId} has reading.md without solve.json.`);
    }
  }

  totalErrors += errors.length;
  totalWarnings += warnings.length;

  console.log(`\n[validate-case-folders] ${caseDirName}`);
  console.log(`  errors: ${errors.length}`);
  console.log(`  warnings: ${warnings.length}`);

  for (const error of errors) {
    console.error(`  [error] ${error}`);
  }

  for (const warning of warnings) {
    console.warn(`  [warning] ${warning}`);
  }
}

if (totalErrors > 0) {
  console.error(`\n[validate-case-folders] Failed with ${totalErrors} error(s) and ${totalWarnings} warning(s).`);
  process.exitCode = 1;
} else {
  console.log(`\n[validate-case-folders] Passed with ${totalWarnings} warning(s).`);
}
