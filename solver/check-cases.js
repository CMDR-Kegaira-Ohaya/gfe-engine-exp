import fs from 'node:fs';
import path from 'node:path';
import { validateCase, solveCase } from './index.js';

const root = process.cwd();
const casesDir = path.join(root, 'cases');

const entries = fs.existsSync(casesDir)
  ? fs.readdirSync(casesDir, { withFileTypes: true })
  : [];

const targets = entries
  .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
  .map(entry => entry.name)
  .filter(name => name !== 'index.json' && !name.startsWith('_'));

let hasErrors = false;

for (const fileName of targets) {
  const filePath = path.join(casesDir, fileName);
  const rawJson = fs.readFileSync(filePath, 'utf8');
  const caseData = JSON.parse(rawJson);
  const validation = validateCase(caseData);
  const solved = solveCase(caseData);

  const errors = validation.issues.filter(issue => issue.level === 'error');
  const warnings = validation.issues.filter(issue => issue.level === 'warning');

  console.log(`
[check-cases] ${fileName}
  timesteps: ${(solved.timeline || []).length}
  errors: ${errors.length}
  warnings: ${warnings.length}
`);

  if (errors.length) {
    hasErrors = true;
    for (const error of errors) {
      console.error(`[error] ${fileName} ${error.path} — ${error.message}`);
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
} else {
  console.log('[check-cases] all cases passed solver validation.');
}
