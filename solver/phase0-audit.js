import fs from 'node:fs';
import path from 'node:path';
import { solveCase, validateCase } from './index.js';

const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');
const manifestPaths = fs
  .readdirSync(fixturesDir)
  .filter(name => name.endsWith('.json'))
  .sort()
  .map(name => path.join(fixturesDir, name));

const manifests = manifestPaths.map(filePath => ({
  file: path.basename(filePath),
  data: JSON.parse(fs.readFileSync(filePath, 'utf8')),
}));

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
    return {
      path: comparePath,
      differs,
      left,
      right,
    };
  });
}

function summarizeValidation(validation) {
  return {
    ok: validation.ok,
    errors: validation.issues.filter(issue => issue.level === 'error').length,
    warnings: validation.issues.filter(issue => issue.level === 'warning').length,
  };
}

function buildParticipantSnapshots(solvedCase) {
  const timeline = Array.isArray(solvedCase?.timeline) ? solvedCase.timeline : [];
  return timeline.map((step, stepIndex) => {
    const participants = Object.fromEntries(
      Object.entries(step?.participants || {}).map(([participantId, participant]) => [
        participantId,
        {
          prevalence: participant?.prevalence || null,
          theta: participant?.theta || null,
          compensation: participant?.compensation || null,
          failure: participant?.failure || null,
          envelope: participant?.envelope || null,
          cascade: participant?.cascade || null,
          relation_summary: participant?.solver_debug?.relation_summary || null,
          relation_traces: participant?.solver_debug?.relation_traces || [],
          canonical_axes: participant?._canonical_axes || null,
          display_axes: participant?.axes || null,
        },
      ])
    );

    return {
      step_index: stepIndex,
      participants,
    };
  });
}

const report = {
  manifests: manifests.map(item => ({
    file: item.file,
    version: item.data.version,
    canon: item.data.canon,
    mode: item.data.mode,
    fixture_pack: item.data.fixture_pack || null,
  })),
  fixtures: [],
};

let hardFailure = false;

for (const manifest of manifests) {
  const fixturePack = manifest.data.fixture_pack || manifest.file;

  for (const fixture of manifest.data.fixtures || []) {
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
        fixture_pack: fixturePack,
        file: manifest.file,
        id: fixture.id,
        row: fixture.row,
        kind: fixture.kind,
        validation: summarizeValidation(validation),
        solve_ok: !!solved,
        path_checks: pathChecks,
        participant_snapshots: buildParticipantSnapshots(solved),
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
        fixture_pack: fixturePack,
        file: manifest.file,
        id: fixture.id,
        row: fixture.row,
        kind: fixture.kind,
        validation_a: summarizeValidation(validationA),
        validation_b: summarizeValidation(validationB),
        differs_somewhere: differsSomewhere,
        comparisons,
        snapshots_a: buildParticipantSnapshots(solvedA),
        snapshots_b: buildParticipantSnapshots(solvedB),
        purpose: fixture.purpose,
      });
      continue;
    }

    hardFailure = true;
    report.fixtures.push({
      fixture_pack: fixturePack,
      file: manifest.file,
      id: fixture.id || '(unknown)',
      error: `Unsupported fixture kind: ${fixture.kind}`,
    });
  }
}

console.log(JSON.stringify(report, null, 2));

if (hardFailure) {
  process.exitCode = 1;
}
