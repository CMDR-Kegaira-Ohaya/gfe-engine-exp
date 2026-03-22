import { discoverCaseFolders, fileExists, getCaseArtifactPaths, safeReadJson } from './common.mjs';

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

  const actual = {
    case: fileExists(paths.casePath),
    encoding: fileExists(paths.encodingPath),
    reading: fileExists(paths.readingPath)
  };

  if (!fileExists(paths.manifestPath)) {
    errors.push('manifest.json is required.');
  }

  if (!actual.encoding) {
    errors.push('encoding.json is required.');
  }

  if (!actual.case) {
    warnings.push('case.md is recommended but currently missing.');
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

  if (manifest) {
    if (!isNonEmptyString(manifest.case_id)) {
      errors.push('manifest.case_id must be a non-empty string.');
    }

    if (!isNonEmptyString(manifest.title)) {
      errors.push('manifest.title must be a non-empty string.');
    }

    if (!manifest.artifacts || typeof manifest.artifacts !== 'object' || Array.isArray(manifest.artifacts)) {
      errors.push('manifest.artifacts must be an object with boolean presence flags.');
    } else {
      for (const key of ['case', 'encoding', 'reading']) {
        if (typeof manifest.artifacts[key] !== 'boolean') {
          errors.push(`manifest.artifacts.${key} must be a boolean.`);
          continue;
        }

        if (manifest.artifacts[key] !== actual[key]) {
          errors.push(
            `manifest.artifacts.${key}=${manifest.artifacts[key]} does not match actual file presence (${actual[key]}).`
          );
        }
      }
    }

    if (Object.prototype.hasOwnProperty.call(manifest, 'slug')) {
      if (!isNonEmptyString(manifest.slug)) {
        errors.push('manifest.slug, if present, must be a non-empty string.');
      } else if (manifest.slug !== caseDirName) {
        errors.push(`manifest.slug (${manifest.slug}) does not match folder name (${caseDirName}).`);
      }
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
