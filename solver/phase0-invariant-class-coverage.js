import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');

const CROSS_PHASE_SEED_MAP = {
  'INV-XPH-04': ['FX-REL-02'],
  'INV-XPH-06': ['FX-ORD-02'],
  'INV-XPH-07': ['FX-FACE-02'],
  'INV-XPH-08': ['FX-THR-02'],
  'INV-XPH-09': ['FX-FAM-02'],
  'INV-XPH-10': ['FX-FAIL-07', 'FX-FAIL-08', 'FX-FAIL-10', 'FX-FAIL-06', 'FX-FAIL-09'],
  'INV-XPH-11': ['FX-LEG-02'],
};

const CROSS_PHASE_EXPECTED_CLASS_MAP = {
  'INV-XPH-04': ['relation_medium_noncollapse', 'relation_interpretation_noncollapse'],
  'INV-XPH-06': ['order_noncollapse_divergence', 'order_interpretation_noncollapse'],
  'INV-XPH-07': ['face_trace_divergence', 'face_footprint_divergence'],
  'INV-XPH-08': ['threshold_noncollapse_divergence', 'threshold_cfg_noncollapse'],
  'INV-XPH-09': ['family_truth_noncollapse', 'family_receiving_noncollapse'],
  'INV-XPH-10': [
    'overflow_noncollapse_divergence',
    'overflow_projection_noncollapse',
    'substitution_noncollapse_divergence',
    'substitution_projection_noncollapse',
    'plastic_noncollapse_divergence',
    'plastic_form_noncollapse',
    'failure_noncollapse_divergence',
    'failure_projection_noncollapse',
    'collapse_noncollapse_divergence',
    'collapse_projection_noncollapse',
  ],
  'INV-XPH-11': ['distributed_leg_noncollapse', 'distributed_leg_interpretation_noncollapse'],
};

const ROW_LOCAL_SUITE_SEED_MAP = {
  'INV-ROW-CORE-01': ['FX-CORE-02', 'FX-CORE-03'],
  'INV-ROW-REL-01': ['FX-REL-02'],
  'INV-ROW-THR-01': ['FX-THR-02'],
  'INV-ROW-FAM-01': ['FX-FAM-02'],
  'INV-ROW-FAIL-OVF-01': ['FX-FAIL-07'],
  'INV-ROW-FAIL-SUB-01': ['FX-FAIL-08'],
  'INV-ROW-FAIL-PLA-01': ['FX-FAIL-10'],
  'INV-ROW-FAIL-SUP-01': ['FX-FAIL-06'],
  'INV-ROW-FAIL-COL-01': ['FX-FAIL-09'],
  'INV-ROW-FACE-01': ['FX-FACE-02'],
  'INV-ROW-ORD-01': ['FX-ORD-02'],
  'INV-ROW-LEG-01': ['FX-LEG-02'],
  'INV-ROW-FLD-01': ['FX-FLD-02'],
};

const ROW_LOCAL_EXPECTED_CLASS_MAP = {
  'INV-ROW-CORE-01': [
    'core_local_axis_noncollapse',
    'core_local_raw_noncollapse',
    'core_local_axis_contrast',
    'core_local_raw_contrast',
  ],
  'INV-ROW-REL-01': ['relation_trace_divergence', 'relation_receiving_divergence'],
  'INV-ROW-THR-01': ['threshold_prevalence_divergence', 'threshold_theta_divergence'],
  'INV-ROW-FAM-01': ['family_truth_divergence', 'family_receiving_divergence'],
  'INV-ROW-FAIL-OVF-01': ['overflow_noncollapse_divergence', 'overflow_projection_noncollapse'],
  'INV-ROW-FAIL-SUB-01': ['substitution_noncollapse_divergence', 'substitution_projection_noncollapse'],
  'INV-ROW-FAIL-PLA-01': ['plastic_noncollapse_divergence', 'plastic_form_noncollapse'],
  'INV-ROW-FAIL-SUP-01': ['failure_noncollapse_divergence', 'failure_projection_noncollapse'],
  'INV-ROW-FAIL-COL-01': ['collapse_noncollapse_divergence', 'collapse_projection_noncollapse'],
  'INV-ROW-FACE-01': ['face_trace_divergence', 'face_footprint_divergence'],
  'INV-ROW-ORD-01': ['order_trace_divergence', 'order_receiving_divergence'],
  'INV-ROW-LEG-01': ['distributed_leg_noncollapse', 'distributed_leg_interpretation_noncollapse'],
  'INV-ROW-FLD-01': ['field_noncollapse_divergence', 'field_interpretation_noncollapse'],
};

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

function collectRegistry(manifests = []) {
  const crossPhase = [];
  const rowLocalSuites = [];
  for (const manifest of manifests) {
    for (const invariant of manifest.data.cross_phase_invariants || []) {
      crossPhase.push({
        id: invariant.id || '(unnamed-invariant)',
        label: invariant.label || '',
        file: manifest.file,
      });
    }
    for (const suite of manifest.data.row_local_suites || []) {
      rowLocalSuites.push({
        suite_id: suite.suite_id || '(unnamed-suite)',
        row: suite.row || '(unmapped-row)',
        label: suite.label || '',
        file: manifest.file,
      });
    }
  }
  return { crossPhase, rowLocalSuites };
}

function evaluateSeedFamily(id, label, seedMap, expectedClassMap, fixtureMap) {
  const seed_fixture_ids = seedMap[id] || [];
  const expected_invariant_classes = expectedClassMap[id] || [];
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
    id,
    label,
    seed_fixture_ids,
    referenced_rows: Array.from(new Set(referenced.map(item => item?.row).filter(Boolean))).sort(),
    referenced_files: Array.from(new Set(referenced.map(item => item?.file).filter(Boolean))).sort(),
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
const registry = collectRegistry(manifests);

const crossPhaseReports = registry.crossPhase
  .map(invariant =>
    evaluateSeedFamily(
      invariant.id,
      invariant.label,
      CROSS_PHASE_SEED_MAP,
      CROSS_PHASE_EXPECTED_CLASS_MAP,
      fixtureMap
    )
  )
  .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const rowLocalReports = registry.rowLocalSuites
  .map(suite =>
    evaluateSeedFamily(
      suite.suite_id,
      suite.label,
      ROW_LOCAL_SUITE_SEED_MAP,
      ROW_LOCAL_EXPECTED_CLASS_MAP,
      fixtureMap
    )
  )
  .map(item => ({ ...item, row: registry.rowLocalSuites.find(suite => suite.suite_id === item.id)?.row || '(unmapped-row)' }))
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
    cross_phase_declared: crossPhaseReports.length,
    cross_phase_static_gaps: failingCrossPhaseReports.length,
    row_local_declared: rowLocalReports.length,
    row_local_static_gaps: failingRowLocalReports.length,
    next_recommended_patch,
  },
  failing_cross_phase_static_gaps: failingCrossPhaseReports,
  failing_row_local_static_gaps: failingRowLocalReports,
};

console.log(JSON.stringify(report, null, 2));

if (failingCrossPhaseReports.length > 0 || failingRowLocalReports.length > 0) {
  process.exitCode = 1;
}
