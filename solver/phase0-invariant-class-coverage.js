import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFixtureManifests() {
  return fs
    .readdirSync(fixturesDir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => ({
      file: name,
      data: readJson(path.join(fixturesDir, name)),
    }));
}

function collectFixtureIndex(manifests = []) {
  const fixtureMap = new Map();
  for (const manifest of manifests) {
    const pack = manifest.data.fixture_pack || manifest.file;
    for (const fixture of manifest.data.fixtures || []) {
      const id = fixture.id || '(unknown-fixture)';
      fixtureMap.set(id, {
        id,
        row: fixture.row || '(unmapped-row)',
        file: manifest.file,
        fixture_pack: pack,
        kind: fixture.kind || '(unknown-kind)',
        fixture_class: fixture.fixture_class || null,
        enforce_invariants: fixture.enforce_invariants === true,
        invariant_classes: Array.isArray(fixture.divergence_invariants)
          ? Array.from(new Set(fixture.divergence_invariants.map(item => item.class).filter(Boolean))).sort()
          : [],
      });
    }
  }
  return fixtureMap;
}

function collectRegistrySlices(manifests = []) {
  const crossPhase = [];
  const rowLocalSuites = [];
  for (const manifest of manifests) {
    for (const invariant of manifest.data.cross_phase_invariants || []) {
      crossPhase.push({
        id: invariant.id || '(unnamed-invariant)',
        label: invariant.label || '',
        file: manifest.file,
        executable_content_slice: invariant.executable_content_slice === true,
        seed_fixture_ids: Array.isArray(invariant.seed_fixture_ids) ? invariant.seed_fixture_ids : [],
        expected_invariant_classes: Array.isArray(invariant.expected_invariant_classes)
          ? invariant.expected_invariant_classes
          : [],
      });
    }
    for (const suite of manifest.data.row_local_suites || []) {
      rowLocalSuites.push({
        suite_id: suite.suite_id || '(unnamed-suite)',
        row: suite.row || '(unmapped-row)',
        label: suite.label || '',
        file: manifest.file,
        executable_content_slice: suite.executable_content_slice === true,
        seed_fixture_ids: Array.isArray(suite.seed_fixture_ids) ? suite.seed_fixture_ids : [],
        expected_invariant_classes: Array.isArray(suite.expected_invariant_classes)
          ? suite.expected_invariant_classes
          : [],
      });
    }
  }
  return { crossPhase, rowLocalSuites };
}

function evaluateSeedFamily(entry = {}, fixtureMap = new Map()) {
  const seed_fixture_ids = entry.seed_fixture_ids || [];
  const expected_invariant_classes = entry.expected_invariant_classes || [];
  const referenced = seed_fixture_ids.map(fixtureId => fixtureMap.get(fixtureId) || null);
  const missing_fixture_ids = seed_fixture_ids.filter(fixtureId => !fixtureMap.has(fixtureId)).sort();
  const unenforced_fixture_ids = referenced
    .filter(item => item && item.enforce_invariants !== true)
    .map(item => item.id)
    .sort();
  const observed_invariant_classes = Array.from(
    new Set(referenced.flatMap(item => (item ? item.invariant_classes : [])))
  ).sort();
  const missing_invariant_classes = expected_invariant_classes
    .filter(className => !observed_invariant_classes.includes(className))
    .sort();

  return {
    id: entry.id || entry.suite_id || '(unnamed-family)',
    row: entry.row || null,
    label: entry.label || '',
    file: entry.file || '',
    executable_content_slice: entry.executable_content_slice === true,
    seed_fixture_ids,
    missing_fixture_ids,
    unenforced_fixture_ids,
    expected_invariant_classes,
    observed_invariant_classes,
    missing_invariant_classes,
    pass:
      missing_fixture_ids.length === 0 &&
      unenforced_fixture_ids.length === 0 &&
      missing_invariant_classes.length === 0,
  };
}

function scoreGap(item = {}) {
  return (
    (item.missing_invariant_classes?.length || 0) * 5 +
    (item.missing_fixture_ids?.length || 0) * 4 +
    (item.unenforced_fixture_ids?.length || 0) * 3
  );
}

const manifests = listFixtureManifests();
const fixtureMap = collectFixtureIndex(manifests);
const registry = collectRegistrySlices(manifests);

const crossPhaseReports = registry.crossPhase
  .filter(item => item.executable_content_slice === true)
  .map(item => evaluateSeedFamily(item, fixtureMap))
  .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const rowLocalReports = registry.rowLocalSuites
  .filter(item => item.executable_content_slice === true)
  .map(item => evaluateSeedFamily(item, fixtureMap))
  .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const failingCrossPhaseReports = crossPhaseReports
  .filter(item => !item.pass)
  .map(item => ({ ...item, priority_score: scoreGap(item) }))
  .sort((left, right) => {
    if (right.priority_score !== left.priority_score) return right.priority_score - left.priority_score;
    return String(left.id).localeCompare(String(right.id));
  });

const failingRowLocalReports = rowLocalReports
  .filter(item => !item.pass)
  .map(item => ({ ...item, priority_score: scoreGap(item) }))
  .sort((left, right) => {
    if (right.priority_score !== left.priority_score) return right.priority_score - left.priority_score;
    return String(left.id).localeCompare(String(right.id));
  });

const next_recommended_patch = (() => {
  const candidates = [
    ...failingCrossPhaseReports.map(item => ({ family: 'cross_phase', id: item.id, score: item.priority_score })),
    ...failingRowLocalReports.map(item => ({ family: 'row_local_suite', id: item.id, score: item.priority_score })),
  ].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return String(left.id).localeCompare(String(right.id));
  });
  return candidates[0] || null;
})();

const report = {
  manifests: manifests.map(item => ({ file: item.file, fixture_pack: item.data.fixture_pack || null })),
  fixture_count: fixtureMap.size,
  summaries: {
    executable_cross_phase_declared: crossPhaseReports.length,
    executable_cross_phase_static_gaps: failingCrossPhaseReports.length,
    executable_row_local_declared: rowLocalReports.length,
    executable_row_local_static_gaps: failingRowLocalReports.length,
    next_recommended_patch,
  },
  failing_cross_phase_static_gaps: failingCrossPhaseReports,
  failing_row_local_static_gaps: failingRowLocalReports,
};

console.log(JSON.stringify(report, null, 2));

if (failingCrossPhaseReports.length > 0 || failingRowLocalReports.length > 0) {
  process.exitCode = 1;
}
