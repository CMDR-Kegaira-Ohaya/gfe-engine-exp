import { validateCase, solveCase } from '../../solver/index.js';
import { discoverCaseFolders, fileExists, getCaseArtifactPaths, readJson } from './common.mjs';

const caseFolders = discoverCaseFolders().filter(caseDirName => fileExists(getCaseArtifactPaths(caseDirName).encodingPath));

if (!caseFolders.length) {
  console.log('[validate-encodings] No canonical encodings found under /cases.');
  process.exit(0);
}

let hasErrors = false;

for (const caseDirName of caseFolders) {
  const { encodingPath } = getCaseArtifactPaths(caseDirName);

  try {
    const encoding = readJson(encodingPath);
    const validation = validateCase(encoding);
    const solved = solveCase(encoding);

    const errors = validation.issues.filter(issue => issue.level === 'error');
    const warnings = validation.issues.filter(issue => issue.level === 'warning');
    const timesteps = Array.isArray(solved.timeline) ? solved.timeline.length : 0;

    console.log(`\n[validate-encodings] ${caseDirName}`);
    console.log(`  timesteps: ${timesteps}`);
    console.log(`  errors: ${errors.length}`);
    console.log(`  warnings: ${warnings.length}`);

    for (const error of errors) {
      console.error(`  [error] ${error.path} — ${error.message}`);
    }

    for (const warning of warnings) {
      console.warn(`  [warning] ${warning.path} — ${warning.message}`);
    }

    if (errors.length > 0) {
      hasErrors = true;
    }
  } catch (error) {
    hasErrors = true;
    console.error(`\n[validate-encodings] ${caseDirName}`);
    console.error(`  [error] encoding.json could not be validated: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.log('\n[validate-encodings] All canonical encodings passed solver validation.');
}
