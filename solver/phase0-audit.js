import fs from 'node:fs';
import path from 'node:path';
import { solveCase, validateCase } from './index.js';
import {
  hasKnownAuditSeedDrift,
  filterPromotionBlockers,
  isKnownCrossPhaseDriftId,
  isKnownRowLocalSuiteDriftId,
  isKnownAffectedRow,
  KNOWN_AUDIT_SEED_DRIFT,
} from './phase0-known-audit-seed-drift.js';


const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');
const CANONICAL_PUBLIC_ENTRYPOINT = 'solver/index.js#solveCase';
const CANONICAL_RUNTIME_MODE = 'canon-locked-runtime';

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
    return { path: comparePath, differs, left, right };
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

    return { step_index: stepIndex, participants };
  });
}

function inferFixtureClass(fixture = {}) {
  if (fixture.fixture_class) return fixture.fixture_class;
  if (fixture.kind === 'single') return 'golden';
  if (fixture.kind === 'contrast') return 'contrast';
  return 'unclassified';
}

function evaluateDivergenceInvariant(invariant = {}, comparisons = []) {
  const expectation = invariant.expectation || 'all_must_differ';
  const requestedPaths = Array.isArray(invariant.paths) ? invariant.paths : [];
  const comparisonMap = new Map(comparisons.map(item => [item.path, item]));
  const matched = requestedPaths.map(pathKey => comparisonMap.get(pathKey)).filter(Boolean);

  const missing_paths = requestedPaths.filter(pathKey => !comparisonMap.has(pathKey));
  const differing_paths = matched.filter(item => item.differs).map(item => item.path);
  const same_paths = matched.filter(item => !item.differs).map(item => item.path);

  let pass = false;
  if (expectation === 'some_must_differ') {
    pass = differing_paths.length > 0;
  } else {
    pass = matched.length > 0 && same_paths.length === 0;
  }

  return {
    label: invariant.label || '(unnamed-invariant)',
    class: invariant.class || 'uncategorized-divergence',
    expectation,
    pass,
    requested_paths: requestedPaths,
    differing_paths,
    same_paths,
    missing_paths,
  };
}

function evaluateDivergenceInvariants(fixture = {}, comparisons = []) {
  const invariants = Array.isArray(fixture.divergence_invariants) ? fixture.divergence_invariants : [];
  const items = invariants.map(invariant => evaluateDivergenceInvariant(invariant, comparisons));
  return {
    enforced: !!fixture.enforce_invariants,
    count: items.length,
    passed: items.filter(item => item.pass).length,
    failed: items.filter(item => !item.pass).length,
    classes: Array.from(new Set(items.map(item => item.class))).sort(),
    items,
  };
}

function evaluateDeterminism(caseData) {
  const solved_first = solveCase(caseData);
  const solved_second = solveCase(caseData);
  return {
    pass: JSON.stringify(solved_first) === JSON.stringify(solved_second),
    solved_first_ok: !!solved_first,
    solved_second_ok: !!solved_second,
  };
}

function getRuntimeIdentity(solvedCase) {
  const solver = solvedCase?.solver || {};
  const version = solver.version || null;
  const mode = solver.mode || null;
  const signature = version || mode
    ? `${version || '(unknown-version)'}::${mode || '(unknown-mode)'}`
    : null;
  return { version, mode, signature };
}

function summarizeCanonicalRuntime(fixtures = []) {
  const runtimeInstances = [];
  const fixtureIds = [];

  for (const fixture of fixtures) {
    if (fixture.kind === 'single' && fixture.runtime_identity?.signature) {
      runtimeInstances.push(fixture.runtime_identity);
      fixtureIds.push(fixture.id || '(unknown-fixture)');
    }
    if (fixture.kind === 'contrast') {
      if (fixture.runtime_identity_a?.signature) {
        runtimeInstances.push(fixture.runtime_identity_a);
        fixtureIds.push(`${fixture.id || '(unknown-fixture)'}:a`);
      }
      if (fixture.runtime_identity_b?.signature) {
        runtimeInstances.push(fixture.runtime_identity_b);
        fixtureIds.push(`${fixture.id || '(unknown-fixture)'}:b`);
      }
    }
  }

  const unique_runtime_signatures = Array.from(
    new Set(runtimeInstances.map(item => item.signature).filter(Boolean))
  ).sort();
  const unique_versions = Array.from(
    new Set(runtimeInstances.map(item => item.version).filter(Boolean))
  ).sort();
  const unique_modes = Array.from(
    new Set(runtimeInstances.map(item => item.mode).filter(Boolean))
  ).sort();
  const public_entrypoint_only = fixtures.every(
    fixture => fixture.public_entrypoint === CANONICAL_PUBLIC_ENTRYPOINT
  );
  const canonical_mode_only = runtimeInstances.length > 0 && runtimeInstances.every(
    item => item.mode === CANONICAL_RUNTIME_MODE
  );
  const runtime_consistent_across_fixtures = unique_runtime_signatures.length === 1;

  return {
    fixture_count: fixtures.length,
    solved_runtime_instances: runtimeInstances.length,
    fixture_ids: fixtureIds,
    public_entrypoint_only,
    canonical_mode_only,
    unique_runtime_signatures,
    unique_versions,
    unique_modes,
    runtime_consistent_across_fixtures,
    single_runtime_signature: runtime_consistent_across_fixtures
      ? unique_runtime_signatures[0] || null
      : null,
  };
}

function buildRowAggregation(fixtures = []) {
  const rowMap = new Map();

  for (const fixture of fixtures) {
    const row = fixture.row || '(unmapped-row)';
    if (!rowMap.has(row)) {
      rowMap.set(row, {
        fixture_ids: new Set(),
        fixture_classes: new Set(),
        packs: new Set(),
        files: new Set(),
        single_fixture_ids: new Set(),
        contrast_fixture_ids: new Set(),
        enforced_fixture_ids: new Set(),
        failing_enforced_fixture_ids: new Set(),
      });
    }

    const entry = rowMap.get(row);
    entry.fixture_ids.add(fixture.id || '(unknown-fixture)');
    if (fixture.fixture_class) entry.fixture_classes.add(fixture.fixture_class);
    if (fixture.fixture_pack) entry.packs.add(fixture.fixture_pack);
    if (fixture.file) entry.files.add(fixture.file);
    if (fixture.kind === 'single') entry.single_fixture_ids.add(fixture.id || '(unknown-fixture)');
    if (fixture.kind === 'contrast') entry.contrast_fixture_ids.add(fixture.id || '(unknown-fixture)');
    if (fixture.divergence_invariants?.enforced) entry.enforced_fixture_ids.add(fixture.id || '(unknown-fixture)');
    if (fixture.hard_gated_failure) entry.failing_enforced_fixture_ids.add(fixture.id || '(unknown-fixture)');
  }

  return rowMap;
}

function inferCoverageState(rowDeclaration = {}, aggregation = null) {
  if (rowDeclaration.current_state) return rowDeclaration.current_state;
  if (aggregation && aggregation.fixture_ids.size > 0) return 'partial';
  return 'parsed-only';
}

function extractInvariantRegistry(manifests = []) {
  const cross_phase_invariants = manifests.flatMap(manifest =>
    (manifest.data.cross_phase_invariants || []).map(invariant => ({
      file: manifest.file,
      fixture_pack: manifest.data.fixture_pack || manifest.file,
      ...invariant,
    }))
  );

  const row_local_suites = manifests.flatMap(manifest =>
    (manifest.data.row_local_suites || []).map(suite => ({
      file: manifest.file,
      fixture_pack: manifest.data.fixture_pack || manifest.file,
      ...suite,
    }))
  );

  return { cross_phase_invariants, row_local_suites };
}

function buildRowLocalSuiteMap(rowLocalSuites = []) {
  const rowMap = new Map();
  for (const suite of rowLocalSuites) {
    const row = suite.row || '(unmapped-row)';
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row).push(suite);
  }
  for (const suites of rowMap.values()) {
    suites.sort((left, right) => String(left.suite_id || '').localeCompare(String(right.suite_id || '')));
  }
  return rowMap;
}

function summarizeInvariantRegistry(invariantRegistry = {}) {
  const crossPhaseInvariants = Array.isArray(invariantRegistry.cross_phase_invariants)
    ? invariantRegistry.cross_phase_invariants
    : [];
  const rowLocalSuites = Array.isArray(invariantRegistry.row_local_suites)
    ? invariantRegistry.row_local_suites
    : [];
  const rowsWithSuites = Array.from(new Set(rowLocalSuites.map(suite => suite.row).filter(Boolean))).sort();

  return {
    cross_phase_invariants: {
      count: crossPhaseInvariants.length,
      ids: crossPhaseInvariants.map(invariant => invariant.id || '(unnamed-invariant)'),
    },
    row_local_suites: {
      count: rowLocalSuites.length,
      rows_covered: rowsWithSuites.length,
      rows: rowsWithSuites,
      suite_ids: rowLocalSuites.map(suite => suite.suite_id || '(unnamed-suite)'),
    },
  };
}

function getCrossPhaseInvariantSeedMap() {
  return {
    'INV-XPH-04': ['FX-REL-02'],
    'INV-XPH-06': ['FX-ORD-02'],
    'INV-XPH-07': ['FX-FACE-02'],
    'INV-XPH-08': ['FX-THR-02'],
    'INV-XPH-09': ['FX-FAM-02'],
    'INV-XPH-10': ['FX-FAIL-07', 'FX-FAIL-08', 'FX-FAIL-10', 'FX-FAIL-06', 'FX-FAIL-09'],
    'INV-XPH-11': ['FX-LEG-02'],
  };
}

function getCrossPhaseInvariantExpectedInvariantClassMap() {
  return {
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
}

function evaluateExecutableCrossPhaseSeedChecks(fixtures = [], invariantRegistry = {}) {
  const fixtureMap = new Map(fixtures.map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
  const registered = Array.isArray(invariantRegistry.cross_phase_invariants)
    ? invariantRegistry.cross_phase_invariants
    : [];
  const registeredMap = new Map(registered.map(invariant => [invariant.id || '(unnamed-invariant)', invariant]));
  const seedMap = getCrossPhaseInvariantSeedMap();
  const expectedClassMap = getCrossPhaseInvariantExpectedInvariantClassMap();

  return Object.entries(seedMap).map(([invariantId, seed_fixture_ids]) => {
    const invariant = registeredMap.get(invariantId) || null;
    const expected_invariant_classes = expectedClassMap[invariantId] || [];
    const executable_content_slice = expected_invariant_classes.length > 0;
    const referencedFixtures = seed_fixture_ids.map(fixtureId => fixtureMap.get(fixtureId)).filter(Boolean);
    const missing_fixture_ids = seed_fixture_ids.filter(fixtureId => !fixtureMap.has(fixtureId)).sort();
    const unenforced_fixture_ids = referencedFixtures
      .filter(fixture => !fixture.divergence_invariants?.enforced)
      .map(fixture => fixture.id || '(unknown-fixture)')
      .sort();
    const failing_fixture_ids = referencedFixtures
      .filter(fixture => !!fixture.hard_gated_failure)
      .map(fixture => fixture.id || '(unknown-fixture)')
      .sort();

    const observedInvariantItems = referencedFixtures.flatMap(fixture =>
      Array.isArray(fixture.divergence_invariants?.items) ? fixture.divergence_invariants.items : []
    );
    const observed_invariant_classes = Array.from(
      new Set(observedInvariantItems.map(item => item.class).filter(Boolean))
    ).sort();
    const missing_invariant_classes = expected_invariant_classes
      .filter(invariantClass => !observed_invariant_classes.includes(invariantClass))
      .sort();
    const failing_invariant_classes = expected_invariant_classes
      .filter(invariantClass => observedInvariantItems.some(item => item.class === invariantClass && item.pass === false))
      .sort();

    const seed_pass =
      missing_fixture_ids.length === 0 &&
      unenforced_fixture_ids.length === 0 &&
      failing_fixture_ids.length === 0;
    const content_pass = !executable_content_slice
      ? null
      : missing_invariant_classes.length === 0 && failing_invariant_classes.length === 0;

    return {
      id: invariantId,
      label: invariant?.label || '(unnamed-invariant)',
      executable_slice: true,
      executable_content_slice,
      enforced: true,
      seed_fixture_ids,
      expected_invariant_classes,
      observed_invariant_classes,
      missing_fixture_ids,
      unenforced_fixture_ids,
      failing_fixture_ids,
      missing_invariant_classes,
      failing_invariant_classes,
      seed_pass,
      content_pass,
      pass: seed_pass && (content_pass !== false),
    };
  });
}

function evaluateExecutableCrossPhaseInvariants(fixtures = [], invariantRegistry = {}) {
  const registered = Array.isArray(invariantRegistry.cross_phase_invariants)
    ? invariantRegistry.cross_phase_invariants
    : [];
  const determinismInvariant = registered.find(invariant => invariant.id === 'INV-XPH-12') || null;

  const deterministicFixtureChecks = fixtures
    .filter(fixture => fixture.kind === 'single' || fixture.kind === 'contrast')
    .map(fixture => {
      if (fixture.kind === 'single') {
        return {
          fixture_id: fixture.id || '(unknown-fixture)',
          row: fixture.row || '(unmapped-row)',
          kind: fixture.kind,
          pass: !!fixture.determinism?.pass,
        };
      }
      return {
        fixture_id: fixture.id || '(unknown-fixture)',
        row: fixture.row || '(unmapped-row)',
        kind: fixture.kind,
        pass: !!fixture.determinism_a?.pass && !!fixture.determinism_b?.pass,
      };
    });

    ... [TRUNCATED] ...