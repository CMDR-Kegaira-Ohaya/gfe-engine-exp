import fs from 'node:fs';
import path from 'node:path';
import { solveCase, validateCase } from './index.js';

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

  const failing_fixture_ids = deterministicFixtureChecks
    .filter(item => !item.pass)
    .map(item => item.fixture_id)
    .sort();

  return {
    determinism: {
      id: determinismInvariant?.id || 'INV-XPH-12',
      label: determinismInvariant?.label || 'determinism invariant',
      executable_slice: true,
      enforced: true,
      checked_fixtures: deterministicFixtureChecks.length,
      passed_fixtures: deterministicFixtureChecks.filter(item => item.pass).length,
      failed_fixtures: deterministicFixtureChecks.filter(item => !item.pass).length,
      failing_fixture_ids,
      pass: failing_fixture_ids.length === 0,
    },
    seed_checks: evaluateExecutableCrossPhaseSeedChecks(fixtures, invariantRegistry),
  };
}

function summarizeExecutableCrossPhaseInvariantChecks(checks = {}) {
  const determinism = checks.determinism || {
    checked_fixtures: 0,
    passed_fixtures: 0,
    failed_fixtures: 0,
    pass: false,
  };
  const seedChecks = Array.isArray(checks.seed_checks) ? checks.seed_checks : [];
  const executableContentChecks = seedChecks.filter(check => check.executable_content_slice);
  return {
    enforced_checks: 1 + seedChecks.length,
    executable_content_checks: executableContentChecks.length,
    passed_checks: (determinism.pass ? 1 : 0) + seedChecks.filter(check => check.pass).length,
    failed_checks: (determinism.pass ? 0 : 1) + seedChecks.filter(check => !check.pass).length,
    passed_content_checks: executableContentChecks.filter(check => check.content_pass === true).length,
    failed_content_checks: executableContentChecks.filter(check => check.content_pass === false).length,
    determinism_checked_fixtures: determinism.checked_fixtures,
    determinism_failed_fixtures: determinism.failed_fixtures,
    seed_check_count: seedChecks.length,
    failed_seed_check_ids: seedChecks.filter(check => !check.pass).map(check => check.id || '(unnamed-invariant)').sort(),
    failing_content_check_ids: executableContentChecks
      .filter(check => check.content_pass === false)
      .map(check => check.id || '(unnamed-invariant)')
      .sort(),
  };
}

function getRowLocalSuiteSeedMap() {
  return {
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
}

function getRowLocalSuiteExpectedInvariantClassMap() {
  return {
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
}

function evaluateExecutableRowLocalSuiteChecks(fixtures = [], invariantRegistry = {}) {
  const fixtureMap = new Map(fixtures.map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
  const suites = Array.isArray(invariantRegistry.row_local_suites) ? invariantRegistry.row_local_suites : [];
  const seedMap = getRowLocalSuiteSeedMap();
  const expectedClassMap = getRowLocalSuiteExpectedInvariantClassMap();

  return suites.map(suite => {
    const suite_id = suite.suite_id || '(unnamed-suite)';
    const seed_fixture_ids = seedMap[suite_id] || [];
    const expected_invariant_classes = expectedClassMap[suite_id] || [];
    const executable_slice = seed_fixture_ids.length > 0;
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

    const seed_pass = !executable_slice
      ? null
      : missing_fixture_ids.length === 0 && unenforced_fixture_ids.length === 0 && failing_fixture_ids.length === 0;
    const content_pass = !executable_content_slice
      ? null
      : missing_invariant_classes.length === 0 && failing_invariant_classes.length === 0;

    return {
      suite_id,
      row: suite.row || '(unmapped-row)',
      label: suite.label || '',
      executable_slice,
      executable_content_slice,
      enforced: executable_slice,
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
      pass: !executable_slice ? null : seed_pass && (content_pass !== false),
    };
  });
}

function summarizeExecutableRowLocalSuiteChecks(checks = []) {
  const executableChecks = checks.filter(check => check.executable_slice);
  const executableContentChecks = executableChecks.filter(check => check.executable_content_slice);
  return {
    declared_suites: checks.length,
    executable_checks: executableChecks.length,
    executable_content_checks: executableContentChecks.length,
    passed_checks: executableChecks.filter(check => check.pass).length,
    failed_checks: executableChecks.filter(check => !check.pass).length,
    passed_content_checks: executableContentChecks.filter(check => check.content_pass === true).length,
    failed_content_checks: executableContentChecks.filter(check => check.content_pass === false).length,
    rows_with_executable_checks: Array.from(new Set(executableChecks.map(check => check.row).filter(Boolean))).length,
    failing_suite_ids: executableChecks.filter(check => !check.pass).map(check => check.suite_id).sort(),
    failing_content_suite_ids: executableContentChecks
      .filter(check => check.content_pass === false)
      .map(check => check.suite_id)
      .sort(),
  };
}

function buildRowLocalSuiteCheckMap(rowLocalSuiteChecks = []) {
  const rowMap = new Map();
  for (const check of rowLocalSuiteChecks) {
    const row = check.row || '(unmapped-row)';
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row).push(check);
  }
  for (const checks of rowMap.values()) {
    checks.sort((left, right) => String(left.suite_id || '').localeCompare(String(right.suite_id || '')));
  }
  return rowMap;
}

function buildCoverageRows(rowDeclarations = [], fixtures = [], invariantRegistry = {}, rowLocalSuiteChecks = []) {
  const declaredRows = Array.isArray(rowDeclarations) ? rowDeclarations : [];
  const aggregation = buildRowAggregation(fixtures);
  const rowLocalSuiteMap = buildRowLocalSuiteMap(invariantRegistry.row_local_suites || []);
  const rowLocalSuiteCheckMap = buildRowLocalSuiteCheckMap(rowLocalSuiteChecks);
  const rows = [];
  const seen = new Set();

  function emptyObserved() {
    return {
      fixture_ids: new Set(),
      fixture_classes: new Set(),
      packs: new Set(),
      files: new Set(),
      single_fixture_ids: new Set(),
      contrast_fixture_ids: new Set(),
      enforced_fixture_ids: new Set(),
      failing_enforced_fixture_ids: new Set(),
    };
  }

  function materializeRow(row, declaration, observed, undeclared = false) {
    const required_fixture_classes = Array.isArray(declaration.required_fixture_classes)
      ? declaration.required_fixture_classes
      : ['golden', 'contrast', 'anti-collapse', 'integration'];
    const observed_fixture_classes = Array.from(observed.fixture_classes).sort();
    const missing_fixture_classes = required_fixture_classes.filter(
      fixtureClass => !observed.fixture_classes.has(fixtureClass)
    );
    const rowLocalSuites = rowLocalSuiteMap.get(row) || [];
    const suiteChecks = rowLocalSuiteCheckMap.get(row) || [];
    const executableSuiteChecks = suiteChecks.filter(check => check.executable_slice);
    const failingSuiteChecks = executableSuiteChecks.filter(check => !check.pass);

    return {
      row,
      current_state: inferCoverageState(declaration, observed),
      target_state: declaration.target_state || 'full',
      authority_note: declaration.authority_note || (undeclared ? 'undeclared-row-observation' : ''),
      runtime_surface: declaration.runtime_surface || '',
      notes: declaration.notes || [],
      required_fixture_classes,
      declared_packs: declaration.packs || [],
      declared_fixture_ids: declaration.fixture_ids || [],
      proof_expectations: declaration.proof_expectations || null,
      row_local_suite_ids: rowLocalSuites.map(suite => suite.suite_id || '(unnamed-suite)'),
      row_local_suite_labels: rowLocalSuites.map(suite => suite.label || ''),
      row_local_suite_count: rowLocalSuites.length,
      has_row_local_suite: rowLocalSuites.length > 0,
      missing_row_local_suite: rowLocalSuites.length === 0,
      executable_row_local_suite_check_ids: executableSuiteChecks.map(check => check.suite_id),
      executable_row_local_suite_check_count: executableSuiteChecks.length,
      passed_row_local_suite_check_count: executableSuiteChecks.filter(check => check.pass).length,
      failed_row_local_suite_check_ids: failingSuiteChecks.map(check => check.suite_id),
      failed_row_local_suite_check_count: failingSuiteChecks.length,
      has_executable_row_local_suite_checks: executableSuiteChecks.length > 0,
      observed_packs: Array.from(observed.packs).sort(),
      observed_files: Array.from(observed.files).sort(),
      observed_fixture_ids: Array.from(observed.fixture_ids).sort(),
      observed_fixture_classes,
      missing_fixture_classes,
      single_fixture_ids: Array.from(observed.single_fixture_ids).sort(),
      contrast_fixture_ids: Array.from(observed.contrast_fixture_ids).sort(),
      enforced_fixture_ids: Array.from(observed.enforced_fixture_ids).sort(),
      failing_enforced_fixture_ids: Array.from(observed.failing_enforced_fixture_ids).sort(),
      hard_gated_phase0: Array.from(observed.enforced_fixture_ids).length > 0,
      hard_gated_failures: Array.from(observed.failing_enforced_fixture_ids).length,
      has_complete_fixture_class_set: missing_fixture_classes.length === 0,
    };
  }

  for (const declaration of declaredRows) {
    const row = declaration.row;
    rows.push(materializeRow(row, declaration, aggregation.get(row) || emptyObserved(), false));
    seen.add(row);
  }

  for (const [row, observed] of aggregation.entries()) {
    if (seen.has(row)) continue;
    rows.push(materializeRow(row, {}, observed, true));
  }

  return rows.sort((left, right) => String(left.row).localeCompare(String(right.row)));
}

function buildRowFixtureMap(fixtures = []) {
  const rowMap = new Map();
  for (const fixture of fixtures) {
    const row = fixture.row || '(unmapped-row)';
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row).push(fixture);
  }
  for (const rowFixtures of rowMap.values()) {
    rowFixtures.sort((left, right) => String(left.id || '').localeCompare(String(right.id || '')));
  }
  return rowMap;
}

function buildFixtureIdMap(fixtures = []) {
  return new Map(fixtures.map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
}

function buildBehavioralContrastSurface(rowFixtures = []) {
  const contrastFixtures = rowFixtures.filter(fixture => fixture.kind === 'contrast');
  const enforcedContrastFixtures = contrastFixtures.filter(fixture => fixture.divergence_invariants?.enforced);
  const passingContrastFixtures = enforcedContrastFixtures.filter(
    fixture => !fixture.hard_gated_failure && (fixture.divergence_invariants?.failed || 0) === 0
  );
  const observedInvariantClasses = Array.from(
    new Set(
      enforcedContrastFixtures.flatMap(fixture =>
        Array.isArray(fixture.divergence_invariants?.classes) ? fixture.divergence_invariants.classes : []
      )
    )
  ).sort();
  const comparedPaths = Array.from(
    new Set(
      contrastFixtures.flatMap(fixture =>
        Array.isArray(fixture.comparisons) ? fixture.comparisons.map(item => item.path).filter(Boolean) : []
      )
    )
  ).sort();

  return {
    contrast_fixture_ids: contrastFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
    enforced_contrast_fixture_ids: enforcedContrastFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
    passing_contrast_fixture_ids: passingContrastFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
    observed_invariant_classes: observedInvariantClasses,
    compared_paths: comparedPaths,
    total_contrast_fixtures: contrastFixtures.length,
    enforced_contrast_fixtures: enforcedContrastFixtures.length,
    passing_contrast_fixtures: passingContrastFixtures.length,
    compared_path_count: comparedPaths.length,
    pass:
      contrastFixtures.length > 0 &&
      enforcedContrastFixtures.length > 0 &&
      passingContrastFixtures.length > 0 &&
      observedInvariantClasses.length > 0 &&
      comparedPaths.length > 0,
  };
}

function buildOutputContractSurface(rowFixtures = []) {
  const integrationFixtures = rowFixtures.filter(fixture => fixture.fixture_class === 'integration');
  const integrationFixturesWithPaths = integrationFixtures.filter(
    fixture => Array.isArray(fixture.path_checks) && fixture.path_checks.length > 0
  );
  const passingIntegrationFixtures = integrationFixturesWithPaths.filter(
    fixture => fixture.path_checks.every(check => check.exists)
  );
  const assertedPaths = Array.from(
    new Set(
      integrationFixturesWithPaths.flatMap(fixture =>
        fixture.path_checks.map(check => check.path).filter(Boolean)
      )
    )
  ).sort();
  const failedPaths = Array.from(
    new Set(
      integrationFixturesWithPaths.flatMap(fixture =>
        fixture.path_checks.filter(check => !check.exists).map(check => check.path).filter(Boolean)
      )
    )
  ).sort();

  return {
    integration_fixture_ids: integrationFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
    integration_fixture_ids_with_paths: integrationFixturesWithPaths.map(fixture => fixture.id || '(unknown-fixture)'),
    passing_integration_fixture_ids: passingIntegrationFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
    asserted_paths: assertedPaths,
    failed_paths: failedPaths,
    integration_fixture_count: integrationFixtures.length,
    integration_fixture_count_with_paths: integrationFixturesWithPaths.length,
    passing_integration_fixture_count: passingIntegrationFixtures.length,
    asserted_path_count: assertedPaths.length,
    failed_path_count: failedPaths.length,
    pass:
      integrationFixtures.length > 0 &&
      integrationFixturesWithPaths.length > 0 &&
      passingIntegrationFixtures.length > 0 &&
      assertedPaths.length > 0 &&
      failedPaths.length === 0,
  };
}

function normalizeExplicitProofExpectations(row = {}) {
  const raw = row?.proof_expectations && typeof row.proof_expectations === 'object'
    ? row.proof_expectations
    : null;
  if (!raw) return null;
  return {
    mode: raw.mode || 'explicit-row-proof-v1',
    behavioral_contrast_surface_required: raw.behavioral_contrast_surface_required,
    output_contract_surface_required: raw.output_contract_surface_required,
    non_collapse_proof_required: raw.non_collapse_proof_required,
    complete_fixture_class_set_required: raw.complete_fixture_class_set_required,
    row_local_suite_required: raw.row_local_suite_required,
    public_entrypoint: raw.public_entrypoint || null,
    runtime_mode: raw.runtime_mode || null,
    integration_fixture_ids: Array.isArray(raw.integration_fixture_ids)
      ? raw.integration_fixture_ids.slice().sort()
      : [],
  };
}

function getRowRuntimeModes(rowFixtures = []) {
  const modes = [];
  for (const fixture of rowFixtures) {
    if (fixture.kind === 'single' && fixture.runtime_identity?.mode) {
      modes.push(fixture.runtime_identity.mode);
    }
    if (fixture.kind === 'contrast') {
      if (fixture.runtime_identity_a?.mode) modes.push(fixture.runtime_identity_a.mode);
      if (fixture.runtime_identity_b?.mode) modes.push(fixture.runtime_identity_b.mode);
    }
  }
  return Array.from(new Set(modes.filter(Boolean))).sort();
}

function buildDeclaredRowProofExpectation(row = {}, fixtureIdMap = new Map()) {
  const explicitProofExpectations = normalizeExplicitProofExpectations(row);
  const declared_fixture_ids = Array.isArray(row.declared_fixture_ids) ? row.declared_fixture_ids : [];
  const declared_files = Array.isArray(row.declared_packs) ? row.declared_packs : [];
  const required_fixture_classes = Array.isArray(row.required_fixture_classes)
    ? row.required_fixture_classes
    : [];
  const declaredFixtureRecords = declared_fixture_ids.map(fixtureId => {
    const fixture = fixtureIdMap.get(fixtureId) || null;
    return {
      id: fixtureId,
      observed: !!fixture,
      kind: fixture?.kind || null,
      fixture_class: fixture?.fixture_class || null,
    };
  });

  const inferred_declared_integration_fixture_ids = declaredFixtureRecords
    .filter(record => record.fixture_class === 'integration')
    .map(record => record.id)
    .sort();

  return {
    declaration_source: explicitProofExpectations
      ? 'explicit-proof-expectations'
      : 'inferred-row-proof-fallback',
    declaration_mode: explicitProofExpectations?.mode || 'inferred-row-proof-v0',
    explicit_proof_expectations: explicitProofExpectations,
    declared_fixture_ids,
    declared_files,
    required_fixture_classes,
    declared_contrast_fixture_ids: declaredFixtureRecords
      .filter(record => record.kind === 'contrast')
      .map(record => record.id)
      .sort(),
    declared_integration_fixture_ids:
      explicitProofExpectations?.integration_fixture_ids?.length > 0
        ? explicitProofExpectations.integration_fixture_ids
        : inferred_declared_integration_fixture_ids,
    unresolved_declared_fixture_ids: declaredFixtureRecords
      .filter(record => !record.observed)
      .map(record => record.id)
      .sort(),
    expects_behavioral_contrast_surface:
      explicitProofExpectations?.behavioral_contrast_surface_required
        ?? required_fixture_classes.includes('contrast'),
    expects_output_contract_surface:
      explicitProofExpectations?.output_contract_surface_required
        ?? required_fixture_classes.includes('integration'),
    expects_non_collapse_proof:
      explicitProofExpectations?.non_collapse_proof_required
        ?? required_fixture_classes.includes('anti-collapse'),
    expects_complete_fixture_class_set:
      explicitProofExpectations?.complete_fixture_class_set_required
        ?? ((row.target_state || '') === 'full'),
    expects_row_local_suite:
      explicitProofExpectations?.row_local_suite_required
        ?? ((row.target_state || '') === 'full'),
    expected_public_entrypoint:
      explicitProofExpectations?.public_entrypoint || CANONICAL_PUBLIC_ENTRYPOINT,
    expected_runtime_mode:
      explicitProofExpectations?.runtime_mode || CANONICAL_RUNTIME_MODE,
  };
}

function evaluateDeclaredRowProofExpectation(
  row = {},
  declaredProofExpectation = {},
  behavioralContrastSurface = {},
  outputContractSurface = {},
  nonCollapsePass = false,
  rowFixtures = []
) {
  const missing_declared_fixture_ids = (declaredProofExpectation.declared_fixture_ids || [])
    .filter(fixtureId => !row.observed_fixture_ids.includes(fixtureId))
    .sort();
  const missing_declared_files = (declaredProofExpectation.declared_files || [])
    .filter(fileName => !row.observed_files.includes(fileName))
    .sort();
  const missing_declared_contrast_fixture_ids = (declaredProofExpectation.declared_contrast_fixture_ids || [])
    .filter(fixtureId => !(behavioralContrastSurface.contrast_fixture_ids || []).includes(fixtureId))
    .sort();
  const missing_declared_integration_fixture_ids = (declaredProofExpectation.declared_integration_fixture_ids || [])
    .filter(fixtureId => !(outputContractSurface.integration_fixture_ids || []).includes(fixtureId))
    .sort();

  const row_runtime_modes = getRowRuntimeModes(rowFixtures);
  const fixture_presence_pass =
    missing_declared_fixture_ids.length === 0 &&
    missing_declared_files.length === 0 &&
    (declaredProofExpectation.unresolved_declared_fixture_ids || []).length === 0;
  const required_fixture_classes_pass = !declaredProofExpectation.expects_complete_fixture_class_set
    ? true
    : row.has_complete_fixture_class_set;
  const behavioral_contrast_pass = !declaredProofExpectation.expects_behavioral_contrast_surface
    ? true
    : behavioralContrastSurface.pass === true && missing_declared_contrast_fixture_ids.length === 0;
  const output_contract_pass = !declaredProofExpectation.expects_output_contract_surface
    ? true
    : outputContractSurface.pass === true && missing_declared_integration_fixture_ids.length === 0;
  const non_collapse_pass = !declaredProofExpectation.expects_non_collapse_proof
    ? true
    : nonCollapsePass === true;
  const row_local_suite_pass = !declaredProofExpectation.expects_row_local_suite
    ? true
    : row.has_row_local_suite === true;
  const public_entrypoint_pass = !declaredProofExpectation.expected_public_entrypoint
    ? true
    : rowFixtures.length > 0 && rowFixtures.every(
      fixture => fixture.public_entrypoint === declaredProofExpectation.expected_public_entrypoint
    );
  const runtime_mode_pass = !declaredProofExpectation.expected_runtime_mode
    ? true
    : row_runtime_modes.length > 0 && row_runtime_modes.every(
      mode => mode === declaredProofExpectation.expected_runtime_mode
    );

  return {
    declaration_source: declaredProofExpectation.declaration_source || 'unknown',
    declaration_mode: declaredProofExpectation.declaration_mode || '',
    fixture_presence_pass,
    required_fixture_classes_pass,
    behavioral_contrast_pass,
    output_contract_pass,
    non_collapse_pass,
    row_local_suite_pass,
    public_entrypoint_pass,
    runtime_mode_pass,
    expected_public_entrypoint: declaredProofExpectation.expected_public_entrypoint || null,
    expected_runtime_mode: declaredProofExpectation.expected_runtime_mode || null,
    observed_runtime_modes: row_runtime_modes,
    missing_declared_fixture_ids,
    missing_declared_files,
    missing_declared_contrast_fixture_ids,
    missing_declared_integration_fixture_ids,
    unresolved_declared_fixture_ids: declaredProofExpectation.unresolved_declared_fixture_ids || [],
    pass:
      fixture_presence_pass &&
      required_fixture_classes_pass &&
      behavioral_contrast_pass &&
      output_contract_pass &&
      non_collapse_pass &&
      row_local_suite_pass &&
      public_entrypoint_pass &&
      runtime_mode_pass,
  };
}

function evaluateRowPromotionGates(coverageRows = [], fixtures = [], crossPhaseChecks = {}, canonicalRuntimeSummary = {}) {
  const rowFixtureMap = buildRowFixtureMap(fixtures);
  const fixtureIdMap = buildFixtureIdMap(fixtures);
  const globalCrossPhasePass =
    !!crossPhaseChecks?.determinism?.pass &&
    (crossPhaseChecks?.seed_checks || []).every(check => check.pass);
  const oldRuntimeIndependencePass =
    !!canonicalRuntimeSummary.single_runtime_signature &&
    canonicalRuntimeSummary.public_entrypoint_only === true &&
    canonicalRuntimeSummary.canonical_mode_only === true &&
    canonicalRuntimeSummary.runtime_consistent_across_fixtures === true;
  const blockerCounts = {};

  const rows = coverageRows.map(row => {
    const rowFixtures = rowFixtureMap.get(row.row) || [];
    const behavioral_contrast_surface = buildBehavioralContrastSurface(rowFixtures);
    const output_contract_surface = buildOutputContractSurface(rowFixtures);
    const rowPublicEntrypointOnly = rowFixtures.length > 0 && rowFixtures.every(
      fixture => fixture.public_entrypoint === CANONICAL_PUBLIC_ENTRYPOINT
    );
    const nonCollapsePass =
      row.observed_fixture_classes.includes('anti-collapse') && row.hard_gated_failures === 0;
    const declared_proof_expectation = buildDeclaredRowProofExpectation(row, fixtureIdMap);
    const declared_proof_expectation_check = evaluateDeclaredRowProofExpectation(
      row,
      declared_proof_expectation,
      behavioral_contrast_surface,
      output_contract_surface,
      nonCollapsePass,
      rowFixtures
    );

    const promotion_checks = {
      canon_anchor: {
        pass: Boolean(row.runtime_surface),
        runtime_surface: row.runtime_surface || '',
      },
      executable_independence: {
        pass: row.has_complete_fixture_class_set && row.hard_gated_phase0,
        has_complete_fixture_class_set: row.has_complete_fixture_class_set,
        hard_gated_phase0: row.hard_gated_phase0,
      },
      behavioral_contrast_proof: {
        pass: behavioral_contrast_surface.pass,
        contrast_fixture_ids: behavioral_contrast_surface.contrast_fixture_ids,
        enforced_contrast_fixture_ids: behavioral_contrast_surface.enforced_contrast_fixture_ids,
        passing_contrast_fixture_ids: behavioral_contrast_surface.passing_contrast_fixture_ids,
        observed_invariant_classes: behavioral_contrast_surface.observed_invariant_classes,
        compared_path_count: behavioral_contrast_surface.compared_path_count,
      },
      invariant_pass: {
        pass: row.has_executable_row_local_suite_checks && row.failed_row_local_suite_check_count === 0 && globalCrossPhasePass,
        row_local_suite_pass: row.has_executable_row_local_suite_checks && row.failed_row_local_suite_check_count === 0,
        cross_phase_pass: globalCrossPhasePass,
      },
      public_path_proof: {
        pass: output_contract_surface.integration_fixture_count > 0 && rowPublicEntrypointOnly,
        integration_fixture_ids: output_contract_surface.integration_fixture_ids,
        public_entrypoint_only: rowPublicEntrypointOnly,
      },
      exposed_output_contract: {
        pass: output_contract_surface.pass,
        passing_integration_fixture_ids: output_contract_surface.passing_integration_fixture_ids,
        asserted_path_count: output_contract_surface.asserted_path_count,
        failed_path_count: output_contract_surface.failed_path_count,
      },
      non_collapse_proof: {
        pass: nonCollapsePass,
        observed_fixture_classes: row.observed_fixture_classes,
        hard_gated_failures: row.hard_gated_failures,
      },
      old_runtime_independence: {
        pass: oldRuntimeIndependencePass,
        status: oldRuntimeIndependencePass ? 'phase0-audit-runtime-evidence' : 'unproven-in-phase0-audit',
        runtime_signature: canonicalRuntimeSummary.single_runtime_signature || null,
        public_entrypoint_only: canonicalRuntimeSummary.public_entrypoint_only || false,
        canonical_mode_only: canonicalRuntimeSummary.canonical_mode_only || false,
        runtime_consistent_across_fixtures: canonicalRuntimeSummary.runtime_consistent_across_fixtures || false,
      },
      evidence_bundle_present: {
        pass:
          row.single_fixture_ids.length > 0 &&
          behavioral_contrast_surface.passing_contrast_fixtures > 0 &&
          row.row_local_suite_count > 0 &&
          output_contract_surface.passing_integration_fixture_count > 0,
        single_fixture_ids: row.single_fixture_ids,
        passing_contrast_fixture_ids: behavioral_contrast_surface.passing_contrast_fixture_ids,
        row_local_suite_ids: row.row_local_suite_ids,
        passing_integration_fixture_ids: output_contract_surface.passing_integration_fixture_ids,
      },
      declared_row_proof_alignment: {
        pass: declared_proof_expectation_check.pass,
        declaration_source: declared_proof_expectation_check.declaration_source,
        declaration_mode: declared_proof_expectation_check.declaration_mode,
        public_entrypoint_pass: declared_proof_expectation_check.public_entrypoint_pass,
        runtime_mode_pass: declared_proof_expectation_check.runtime_mode_pass,
        expected_public_entrypoint: declared_proof_expectation_check.expected_public_entrypoint,
        expected_runtime_mode: declared_proof_expectation_check.expected_runtime_mode,
        observed_runtime_modes: declared_proof_expectation_check.observed_runtime_modes,
        missing_declared_fixture_ids: declared_proof_expectation_check.missing_declared_fixture_ids,
        missing_declared_files: declared_proof_expectation_check.missing_declared_files,
        missing_declared_contrast_fixture_ids: declared_proof_expectation_check.missing_declared_contrast_fixture_ids,
        missing_declared_integration_fixture_ids: declared_proof_expectation_check.missing_declared_integration_fixture_ids,
        unresolved_declared_fixture_ids: declared_proof_expectation_check.unresolved_declared_fixture_ids,
      },
    };

    const promotion_blockers = Object.entries(promotion_checks)
      .filter(([, value]) => value.pass !== true)
      .map(([key]) => key)
      .sort();

    for (const blocker of promotion_blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1;
    }

    return {
      ...row,
      behavioral_contrast_surface,
      output_contract_surface,
      declared_proof_expectation,
      declared_proof_expectation_check,
      promotion_checks,
      full_contract_eligible: promotion_blockers.length === 0,
      promotion_blockers,
      promotion_state: promotion_blockers.length === 0 ? 'full-contract-eligible' : 'not-yet-full',
    };
  });

  const full_contract_eligible_row_ids = rows
    .filter(row => row.full_contract_eligible)
    .map(row => row.row)
    .sort();

  return {
    rows,
    summary: {
      total_rows: rows.length,
      full_contract_eligible_rows: full_contract_eligible_row_ids.length,
      not_yet_eligible_rows: rows.length - full_contract_eligible_row_ids.length,
      full_contract_eligible_row_ids,
      blocker_counts: blockerCounts,
      rows_with_behavioral_contrast_surface: rows.filter(row => row.behavioral_contrast_surface.pass).length,
      rows_with_output_contract_surface: rows.filter(row => row.output_contract_surface.pass).length,
      rows_with_declared_row_proof_alignment: rows.filter(row => row.declared_proof_expectation_check.pass).length,
      rows_with_explicit_proof_expectations: rows.filter(
        row => row.declared_proof_expectation.declaration_source === 'explicit-proof-expectations'
      ).length,
    },
  };
}

function summarizeCoverageRows(coverageRows = []) {
  const summary = {
    total_rows: coverageRows.length,
    by_state: {},
    hard_gated_rows: 0,
    rows_with_failing_gates: 0,
    rows_with_complete_fixture_class_set: 0,
    rows_with_row_local_suites: 0,
    rows_missing_row_local_suites: 0,
    rows_with_executable_row_local_suite_checks: 0,
    rows_with_failed_row_local_suite_checks: 0,
    rows_full_contract_eligible: 0,
    rows_old_runtime_independence_proven: 0,
    rows_with_behavioral_contrast_surface: 0,
    rows_with_output_contract_surface: 0,
    rows_with_declared_row_proof_alignment: 0,
    rows_with_explicit_proof_expectations: 0,
  };

  for (const row of coverageRows) {
    summary.by_state[row.current_state] = (summary.by_state[row.current_state] || 0) + 1;
    if (row.hard_gated_phase0) summary.hard_gated_rows += 1;
    if (row.hard_gated_failures > 0) summary.rows_with_failing_gates += 1;
    if (row.has_complete_fixture_class_set) summary.rows_with_complete_fixture_class_set += 1;
    if (row.has_row_local_suite) summary.rows_with_row_local_suites += 1;
    if (row.missing_row_local_suite) summary.rows_missing_row_local_suites += 1;
    if (row.has_executable_row_local_suite_checks) summary.rows_with_executable_row_local_suite_checks += 1;
    if (row.failed_row_local_suite_check_count > 0) summary.rows_with_failed_row_local_suite_checks += 1;
    if (row.full_contract_eligible) summary.rows_full_contract_eligible += 1;
    if (row.promotion_checks?.old_runtime_independence?.pass) summary.rows_old_runtime_independence_proven += 1;
    if (row.behavioral_contrast_surface?.pass) summary.rows_with_behavioral_contrast_surface += 1;
    if (row.output_contract_surface?.pass) summary.rows_with_output_contract_surface += 1;
    if (row.declared_proof_expectation_check?.pass) summary.rows_with_declared_row_proof_alignment += 1;
    if (row.declared_proof_expectation?.declaration_source === 'explicit-proof-expectations') {
      summary.rows_with_explicit_proof_expectations += 1;
    }
  }

  return summary;
}

const coverageRowDeclarations = manifests.flatMap(item =>
  Array.isArray(item.data.rows) ? item.data.rows : []
);
const invariantRegistry = extractInvariantRegistry(manifests);

const report = {
  manifests: manifests.map(item => ({
    file: item.file,
    version: item.data.version,
    canon: item.data.canon,
    mode: item.data.mode,
    fixture_pack: item.data.fixture_pack || null,
  })),
  invariant_registry: invariantRegistry,
  invariant_summary: summarizeInvariantRegistry(invariantRegistry),
  canonical_runtime_summary: {},
  cross_phase_invariant_checks: {},
  cross_phase_invariant_check_summary: {},
  row_local_suite_checks: [],
  row_local_suite_check_summary: {},
  promotion_gate_summary: {},
  fixtures: [],
  coverage_rows: [],
  coverage_summary: {},
};

let hardFailure = false;

for (const manifest of manifests) {
  const fixturePack = manifest.data.fixture_pack || manifest.file;

  for (const fixture of manifest.data.fixtures || []) {
    const fixtureClass = inferFixtureClass(fixture);

    if (fixture.kind === 'single') {
      const caseData = fixture.case_data;
      const validation = validateCase(caseData);
      const solved = solveCase(caseData);
      const determinism = evaluateDeterminism(caseData);
      const runtime_identity = getRuntimeIdentity(solved);
      const path_checks = (fixture.assertions || [])
        .filter(assertion => assertion.startsWith('path_exists:'))
        .map(assertion => {
          const checkPath = assertion.slice('path_exists:'.length);
          return { path: checkPath, exists: getAtPath(solved, checkPath) !== undefined };
        });

      if (!validation.ok || !determinism.pass) hardFailure = true;

      report.fixtures.push({
        fixture_pack: fixturePack,
        file: manifest.file,
        id: fixture.id,
        row: fixture.row,
        kind: fixture.kind,
        fixture_class: fixtureClass,
        public_entrypoint: CANONICAL_PUBLIC_ENTRYPOINT,
        runtime_identity,
        validation: summarizeValidation(validation),
        solve_ok: !!solved,
        determinism,
        path_checks,
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
      const determinismA = evaluateDeterminism(caseA);
      const determinismB = evaluateDeterminism(caseB);
      const runtime_identity_a = getRuntimeIdentity(solvedA);
      const runtime_identity_b = getRuntimeIdentity(solvedB);

      if (!validationA.ok || !validationB.ok || !determinismA.pass || !determinismB.pass) {
        hardFailure = true;
      }

      const comparisons = comparePaths(solvedA, solvedB, fixture.compare_paths || []);
      const differs_somewhere = comparisons.some(item => item.differs);
      const divergence_invariants = evaluateDivergenceInvariants(fixture, comparisons);
      const hard_gated_failure = !!fixture.enforce_invariants && divergence_invariants.failed > 0;

      if (hard_gated_failure) {
        hardFailure = true;
      }

      report.fixtures.push({
        fixture_pack: fixturePack,
        file: manifest.file,
        id: fixture.id,
        row: fixture.row,
        kind: fixture.kind,
        fixture_class: fixtureClass,
        public_entrypoint: CANONICAL_PUBLIC_ENTRYPOINT,
        runtime_identity_a,
        runtime_identity_b,
        runtime_identity_consistent: runtime_identity_a.signature === runtime_identity_b.signature,
        validation_a: summarizeValidation(validationA),
        validation_b: summarizeValidation(validationB),
        determinism_a: determinismA,
        determinism_b: determinismB,
        differs_somewhere,
        hard_gated_failure,
        divergence_invariants,
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
      row: fixture.row || '(unmapped-row)',
      kind: fixture.kind || '(unknown-kind)',
      fixture_class: fixtureClass,
      public_entrypoint: CANONICAL_PUBLIC_ENTRYPOINT,
      error: `Unsupported fixture kind: ${fixture.kind}`,
    });
  }
}

report.canonical_runtime_summary = summarizeCanonicalRuntime(report.fixtures);
report.cross_phase_invariant_checks = evaluateExecutableCrossPhaseInvariants(report.fixtures, invariantRegistry);
report.cross_phase_invariant_check_summary = summarizeExecutableCrossPhaseInvariantChecks(
  report.cross_phase_invariant_checks
);

if (report.cross_phase_invariant_checks.determinism?.failed_fixtures > 0) hardFailure = true;
if ((report.cross_phase_invariant_checks.seed_checks || []).some(check => !check.pass)) hardFailure = true;

report.row_local_suite_checks = evaluateExecutableRowLocalSuiteChecks(report.fixtures, invariantRegistry);
report.row_local_suite_check_summary = summarizeExecutableRowLocalSuiteChecks(report.row_local_suite_checks);
if (report.row_local_suite_check_summary.failed_checks > 0) hardFailure = true;

report.coverage_rows = buildCoverageRows(
  coverageRowDeclarations,
  report.fixtures,
  invariantRegistry,
  report.row_local_suite_checks
);

const promotionEvaluation = evaluateRowPromotionGates(
  report.coverage_rows,
  report.fixtures,
  report.cross_phase_invariant_checks,
  report.canonical_runtime_summary
);
report.coverage_rows = promotionEvaluation.rows;
report.promotion_gate_summary = promotionEvaluation.summary;
report.coverage_summary = summarizeCoverageRows(report.coverage_rows);

console.log(JSON.stringify(report, null, 2));

if (hardFailure) {
  process.exitCode = 1;
}
