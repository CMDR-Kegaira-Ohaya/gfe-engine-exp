import fs from 'node:fs';
import path from 'node:path';
import { solveCase, validateCase } from './index.js';

const root = process.cwd();
const manifestPath = path.join(root, 'solver', 'fixtures', 'phase0', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function getAtPath(value, dottedPath) {
  return String(dottedPath || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, key) => {
      if (current === undefined || current === null) return undefined;
      if (/^\d+$/.test(key)) return current[Number(key)];
      return current[key];
    }, value);
}

function comparePaths(solvedA, solvedB, paths) {
  return (paths || []).map(comparePath => {
    const left = getAtPath(solvedA, comparePath);
    const right = getAtPath(solvedB, comparePath);
    const differs = JSON.stringify(left) !== JSON.stringify(right);
    return { path: comparePath, differs };
  });
}

function summarizeValidation(validation) {
  return {
    ok: validation.ok,
    errors: validation.issues.filter(issue => issue.level === 'error').length,
    warnings: validation.issues.filter(issue => issue.level === 'warning').length,
  };
}

const report = {
  manifest: {
    version: manifest.version,
    canon: manifest.canon,
    mode: manifest.mode,
  },
  fixtures: [],
};

let hardFailure = false;

for (const fixture of manifest.fixtures || []) {
  if (fixture.kind === 'single') {
    const caseData = fixture.case_data;
    const validation = validateCase(caseData);
    const solved = solveCase(caseData);
    const pathChecks = (fixture.assertions || [])
      .filter(assertion => assertion.startsWith('path_exists:'))
      .map(assertion => {
        const checkPath = assertion.slice('path_exists:'.length);
        return {
          path: checkPath,
          exists: getAtPath(solved, checkPath) !== undefined,
        };
      });

    if (!validation.ok) hardFailure = true;

    report.fixtures.push({
      id: fixture.id,
      row: fixture.row,
      kind: fixture.kind,
      validation: summarizeValidation(validation),
      solve_ok: !!solved,
      path_checks: pathChecks,
      purpose: fixture.purpose,
    });
    continue;
  }

  if (fixture.kind === 'contrast') {
    const caseA = fixture.case_a_data;
    const caseB = fixture.case_b_data;
    const validationA = validateCase(caseA);
    const validationB = validateCase(caseB);
    const solvedA = solveCase(caseA);
    const solvedB = solveCase(caseB);

    if (!validationA.ok || !validationB.ok) hardFailure = true;

    const comparisons = comparePaths(solvedA, solvedB, fixture.compare_paths || []);
    const differsSomewhere = comparisons.some(item => item.differs);

    report.fixtures.push({
      id: fixture.id,
      row: fixture.row,
      kind: fixture.kind,
      validation_a: summarizeValidation(validationA),
      validation_b: summarizeValidation(validationB),
      differs_somewhere: differsSomewhere,
      comparisons,
      purpose: fixture.purpose,
    });
    continue;
  }

  hardFailure = true;
  report.fixtures.push({
    id: fixture.id || '(unknown)',
    error: `Unsupported fixture kind: ${fixture.kind}`,
  });
}

console.log(JSON.stringify(report, null, 2));

if (hardFailure) {
  process.exitCode = 1;
}
