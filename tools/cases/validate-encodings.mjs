import { validateCase, solveCase } from '../../solver/index.js';
import { discoverCaseFolders, getRevisionEncodingRecords, readJson, toRepoPath } from './common.mjs';

const records = discoverCaseFolders().flatMap((caseDirName) =>
  getRevisionEncodingRecords(caseDirName).map((record) => ({ caseDirName, ...record }))
);

if (!records.length) {
  console.log('[validate-encodings] No canonical encodings found under /cases.');
  process.exit(0);
}

let hasErrors = false;

for (const record of records) {
  try {
    const encoding = readJson(record.encodingPath);
    const validation = validateCase(encoding);
    const solved = solveCase(encoding);

    const errors = validation.issues.filter((issue) => issue.level === 'error');
    const warnings = validation.issues.filter((issue) => issue.level === 'warning');
    const timesteps = Array.isArray(solved.timeline) ? solved.timeline.length : 0;

    console.log(`\n[validate-encodings] ${record.caseDirName} :: ${record.revisionId}`);
    console.log(`  path: ${toRepoPath(record.encodingPath)}`);
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
    console.error(`\n[validate-encodings] ${record.caseDirName} :: ${record.revisionId}`);
    console.error(
      `  [error] ${toRepoPath(record.encodingPath)} could not be validated: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.log('\n[validate-encodings] All canonical encodings passed solver validation.');
}
