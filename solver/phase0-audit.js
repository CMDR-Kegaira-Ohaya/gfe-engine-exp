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
  const matched = requestedPaths
    .map(pathKey => comparisonMap.get(pathKey))
    .filter(Boolean);

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
  const invariants = Array.isArray(fixture.divergence_invariants)
    ? fixture.divergence_invariants
    : [];

  const evaluated = invariants.map(invariant =>
    evaluateDivergenceInvariant(invariant, comparisons)
  );

  const classes = Array.from(new Set(evaluated.map(item => item.class))).sort();
  return {
    enforced: !!fixture.enforce_invariants,
    count: evaluated.length,
    passed: evaluated.filter(item => item.pass).length,
    failed: evaluated.filter(item => !item.pass).length,
    classes,
    items: evaluated,
  };
}

function evaluateDeterminism(caseData) {
  const solved_first = solveCase(caseData);
  const solved_second = solveCase(caseData);
  const first_json = JSON.stringify(solved_first);
  const second_json = JSON.stringify(solved_second);

  return {
    pass: first_json === second_json,
    solved_first_ok: !!solved_first,
    solved_second_ok: !!solved_second,
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
  const crossPhaseInvariants = manifests.flatMap(manifest =>
    (manifest.data.cross_phase_invariants || []).map(invariant => ({
      file: manifest.file,
      fixture_pack: manifest.data.fixture_pack || manifest.file,
      ...invariant,
    }))
  );

  const rowLocalSuites = manifests.flatMap(manifest =>
    (manifest.data.row_local_suites || []).map(suite => ({
      file: manifest.file,
      fixture_pack: manifest.data.fixture_pack || manifest.file,
      ...suite,
    }))
  );

  return {
    cross_phase_invariants: crossPhaseInvariants,
    row_local_suites: rowLocalSuites,
  };
}

function buildRowLocalSuiteMap(rowLocalSuites = []) {
  const rowMap = new Map();

  for (const suite of rowLocalSuites) {
    const row = suite.row || '(unmapped-row)';
    if (!rowMap.has(row)) rowMap.set(row, []);
    rowMap.get(row).push(suite);
  }

  for (const suites of rowMap.values()) {
    suites.sort((left, right) =>
      String(left.suite_id || '').localeCompare(String(right.suite_id || ''))
    );
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
  const rowsWithSuites = Array.from(
    new Set(rowLocalSuites.map(suite => suite.row).filter(Boolean))
  ).sort();

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

function evaluateExecutableCrossPhaseInvariants(fixtures = [], invariantRegistry = {}) {
  const registered = Array.isArray(invariantRegistry.cross_phase_invariants)
    ? invariantRegistry.cross_phase_invariants
    : [];
  const determinismInvariant = registered.find(invariant => invariant.id === 'INV-XPH-12') || null;

  const deterministicFixtureChecks = fixtures
    .filter(fixture => fixture.kind === 'single' || fixture.kind === 'contrast')
    .map(fixture => {
      if (fixture.kind === 'single') {
        const pass = !!fixture.determinism?.pass;
        return {
          fixture_id: fixture.id || '(unknown-fixture)',
          row: fixture.row || '(unmapped-row)',
          kind: fixture.kind,
          pass,
        };
      }

      const pass = !!fixture.determinism_a?.pass && !!fixture.determinism_b?.pass;
      return {
        fixture_id: fixture.id || '(unknown-fixture)',
        row: fixture.row || '(unmapped-row)',
        kind: fixture.kind,
        pass,
      };
    });

  const failingFixtureIds = deterministicFixtureChecks
    .filter(item => !item.pass)
    .map(item => item.fixture_id)
    .sort();

  const determinismCheck = {
    id: determinismInvariant?.id || 'INV-XPH-12',
    label: determinismInvariant?.label || 'determinism invariant',
    executable_slice: true,
    enforced: true,
    checked_fixtures: deterministicFixtureChecks.length,
    passed_fixtures: deterministicFixtureChecks.filter(item => item.pass).length,
    failed_fixtures: deterministicFixtureChecks.filter(item => !item.pass).length,
    failing_fixture_ids: failingFixtureIds,
    pass: failingFixtureIds.length === 0,
  };

  return {
    determinism: determinismCheck,
    seed_checks: evaluateExecutableCrossPhaseSeedChecks(fixtures, invariantRegistry),
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
    'INV-XPH-04': [
      'relation_medium_noncollapse',
      'relation_interpretation_noncollapse',
    ],
    'INV-XPH-06': [
      'order_noncollapse_divergence',
      'order_interpretation_noncollapse',
    ],
    'INV-XPH-07': [
      'face_trace_divergence',
      'face_footprint_divergence',
    ],
    'INV-XPH-08': [
      'threshold_noncollapse_divergence',
      'threshold_cfg_noncollapse',
    ],
    'INV-XPH-09': [
      'family_truth_noncollapse',
      'family_receiving_noncollapse',
    ],
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
    'INV-XPH-11': [
      'distributed_leg_noncollapse',
      'distributed_leg_interpretation_noncollapse',
    ],
  };
}

function evaluateExecutableCrossPhaseSeedChecks(fixtures = [], invariantRegistry = {}) {
  const fixtureMap = new Map(fixtures.map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
  const registered = Array.isArray(invariantRegistry.cross_phase_invariants)
    ? invariantRegistry.cross_phase_invariants
    : [];
  const registeredMap = new Map(registered.map(invariant => [invariant.id || '(unnamed-invariant)', invariant]));
  const seedMap = getCrossPhaseInvariantSeedMap();
  const expectedInvariantClassMap = getCrossPhaseInvariantExpectedInvariantClassMap();

  return Object.entries(seedMap).map(([invariantId, seed_fixture_ids]) => {
    const invariant = registeredMap.get(invariantId) || null;
    const expected_invariant_classes = expectedInvariantClassMap[invariantId] || [];
    const executable_content_slice = expected_invariant_classes.length > 0;
    const referencedFixtures = seed_fixture_ids
      .map(fixtureId => fixtureMap.get(fixtureId))
      .filter(Boolean);
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
      .filter(invariantClass =>
        observedInvariantItems.some(item => item.class === invariantClass && item.pass === false)
      )
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

function summarizeExecutableCrossPhaseInvariantChecks(checks = {}) {
  const determinism = checks.determinism || {
    checked_fixtures: 0,
    passed_fixtures: 0,
    failed_fixtures: 0,
    pass: false,
  };
  const seedChecks = Array.isArray(checks.seed_checks) ? checks.seed_checks : [];
  const executableContentChecks = seedChecks.filter(check => check.executable_content_slice);
  const failingSeedCheckIds = seedChecks
    .filter(check => !check.pass)
    .map(check => check.id || '(unnamed-invariant)')
    .sort();
  const failingContentCheckIds = executableContentChecks
    .filter(check => check.content_pass === false)
    .map(check => check.id || '(unnamed-invariant)')
    .sort();

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
    failed_seed_check_ids: failingSeedCheckIds,
    failing_content_check_ids: failingContentCheckIds,
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
    'INV-ROW-REL-01': [
      'relation_trace_divergence',
      'relation_receiving_divergence',
    ],
    'INV-ROW-THR-01': [
      'threshold_prevalence_divergence',
      'threshold_theta_divergence',
    ],
    'INV-ROW-FAM-01': [
      'family_truth_divergence',
      'family_receiving_divergence',
    ],
    'INV-ROW-FAIL-OVF-01': [
      'overflow_noncollapse_divergence',
      'overflow_projection_noncollapse',
    ],
    'INV-ROW-FAIL-SUB-01': [
      'substitution_noncollapse_divergence',
      'substitution_projection_noncollapse',
    ],
    'INV-ROW-FAIL-PLA-01': [
      'plastic_noncollapse_divergence',
      'plastic_form_noncollapse',
    ],
    'INV-ROW-FAIL-SUP-01': [
      'failure_noncollapse_divergence',
      'failure_projection_noncollapse',
    ],
    'INV-ROW-FAIL-COL-01': [
      'collapse_noncollapse_divergence',
      'collapse_projection_noncollapse',
    ],
    'INV-ROW-FACE-01': [
      'face_trace_divergence',
      'face_footprint_divergence',
    ],
    'INV-ROW-ORD-01': [
      'order_trace_divergence',
      'order_receiving_divergence',
    ],
    'INV-ROW-LEG-01': [
      'distributed_leg_noncollapse',
      'distributed_leg_interpretation_noncollapse',
    ],
    'INV-ROW-FLD-01': [
      'field_noncollapse_divergence',
      'field_interpretation_noncollapse',
    ],
  };
}

function evaluateExecutableRowLocalSuiteChecks(fixtures = [], invariantRegistry = {}) {
  const fixtureMap = new Map(fixtures.map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
  const suites = Array.isArray(invariantRegistry.row_local_suites) ? invariantRegistry.row_local_suites : [];
  const suiteSeedMap = getRowLocalSuiteSeedMap();
  const suiteExpectedInvariantClassMap = getRowLocalSuiteExpectedInvariantClassMap();

  return suites.map(suite => {
    const suiteId = suite.suite_id || '(unnamed-suite)';
    const seed_fixture_ids = suiteSeedMap[suiteId] || [];
    const expected_invariant_classes = suiteExpectedInvariantClassMap[suiteId] || [];
    const executable_slice = seed_fixture_ids.length > 0;
    const executable_content_slice = expected_invariant_classes.length > 0;
    const referencedFixtures = seed_fixture_ids
      .map(fixtureId => fixtureMap.get(fixtureId))
      .filter(Boolean);
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
      .filter(invariantClass =>
        observedInvariantItems.some(item => item.class === invariantClass && item.pass === false)
      )
      .sort();

    const seed_pass = !executable_slice
      ? null
      : missing_fixture_ids.length === 0 &&
        unenforced_fixture_ids.length === 0 &&
        failing_fixture_ids.length === 0;
    const content_pass = !executable_content_slice
      ? null
      : missing_invariant_classes.length === 0 && failing_invariant_classes.length === 0;
    const pass = !executable_slice
      ? null
      : seed_pass && (content_pass !== false);

    return {
      suite_id: suiteId,
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
      pass,
    };
  });
}

function summarizeExecutableRowLocalSuiteChecks(checks = []) {
  const executableChecks = checks.filter(check => check.executable_slice);
  const executableContentChecks = executableChecks.filter(check => check.executable_content_slice);
  const failingSuiteIds = executableChecks
    .filter(check => !check.pass)
    .map(check => check.suite_id)
    .sort();
  const failingContentSuiteIds = executableContentChecks
    .filter(check => check.content_pass === false)
    .map(check => check.suite_id)
    .sort();
  const rowsWithExecutableChecks = Array.from(
    new Set(executableChecks.map(check => check.row).filter(Boolean))
  ).sort();

  return {
    declared_suites: checks.length,
    executable_checks: executableChecks.length,
    executable_content_checks: executableContentChecks.length,
    passed_checks: executableChecks.filter(check => check.pass).length,
    failed_checks: executableChecks.filter(check => !check.pass).length,
    passed_content_checks: executableContentChecks.filter(check => check.content_pass === true).length,
    failed_content_checks: executableContentChecks.filter(check => check.content_pass === false).length,
    rows_with_executable_checks: rowsWithExecutableChecks.length,
    failing_suite_ids: failingSuiteIds,
    failing_content_suite_ids: failingContentSuiteIds,
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
    checks.sort((left, right) =>
      String(left.suite_id || '').localeCompare(String(right.suite_id || ''))
    );
  }

  return rowMap;
}

function buildCoverageRows(
  rowDeclarations = [],
  fixtures = [],
  invariantRegistry = {},
  rowLocalSuiteChecks = []
) {
  const declaredRows = Array.isArray(rowDeclarations) ? rowDeclarations : [];
  const aggregation = buildRowAggregation(fixtures);
  const rowLocalSuiteMap = buildRowLocalSuiteMap(invariantRegistry.row_local_suites || []);
  const rowLocalSuiteCheckMap = buildRowLocalSuiteCheckMap(rowLocalSuiteChecks);
  const rows = [];
  const seen = new Set();

  for (const declaration of declaredRows) {
    const row = declaration.row;
    const observed = aggregation.get(row) || {
      fixture_ids: new Set(),
      fixture_classes: new Set(),
      packs: new Set(),
      files: new Set(),
      single_fixture_ids: new Set(),
      contrast_fixture_ids: new Set(),
      enforced_fixture_ids: new Set(),
      failing_enforced_fixture_ids: new Set(),
    };

    const requiredFixtureClasses = Array.isArray(declaration.required_fixture_classes)
      ? declaration.required_fixture_classes
      : ['golden', 'contrast', 'anti-collapse', 'integration'];
    const observedFixtureClasses = Array.from(observed.fixture_classes).sort();
    const missingFixtureClasses = requiredFixtureClasses.filter(
      fixtureClass => !observed.fixture_classes.has(fixtureClass)
    );
    const rowLocalSuites = rowLocalSuiteMap.get(row) || [];
    const suiteChecks = rowLocalSuiteCheckMap.get(row) || [];
    const executableSuiteChecks = suiteChecks.filter(check => check.executable_slice);
    const failingSuiteChecks = executableSuiteChecks.filter(check => !check.pass);

    seen.add(row);
    rows.push({
      row,
      current_state: inferCoverageState(declaration, observed),
      target_state: declaration.target_state || 'full',
      authority_note: declaration.authority_note || '',
      runtime_surface: declaration.runtime_surface || '',
      notes: declaration.notes || [],
      required_fixture_classes: requiredFixtureClasses,
      declared_packs: declaration.packs || [],
      declared_fixture_ids: declaration.fixture_ids || [],
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
      observed_fixture_classes: observedFixtureClasses,
      missing_fixture_classes: missingFixtureClasses,
      single_fixture_ids: Array.from(observed.single_fixture_ids).sort(),
      contrast_fixture_ids: Array.from(observed.contrast_fixture_ids).sort(),
      enforced_fixture_ids: Array.from(observed.enforced_fixture_ids).sort(),
      failing_enforced_fixture_ids: Array.from(observed.failing_enforced_fixture_ids).sort(),
      hard_gated_phase0: Array.from(observed.enforced_fixture_ids).length > 0,
      hard_gated_failures: Array.from(observed.failing_enforced_fixture_ids).length,
      has_complete_fixture_class_set: missingFixtureClasses.length === 0,
    });
  }

  for (const [row, observed] of aggregation.entries()) {
    if (seen.has(row)) continue;
    const observedFixtureClasses = Array.from(observed.fixture_classes).sort();
    const rowLocalSuites = rowLocalSuiteMap.get(row) || [];
    const suiteChecks = rowLocalSuiteCheckMap.get(row) || [];
    const executableSuiteChecks = suiteChecks.filter(check => check.executable_slice);
    const failingSuiteChecks = executableSuiteChecks.filter(check => !check.pass);

    rows.push({
      row,
      current_state: inferCoverageState({}, observed),
      target_state: 'full',
      authority_note: 'undeclared-row-observation',
      runtime_surface: '',
      notes: [],
      required_fixture_classes: ['golden', 'contrast', 'anti-collapse', 'integration'],
      declared_packs: [],
      declared_fixture_ids: [],
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
      observed_fixture_classes: observedFixtureClasses,
      missing_fixture_classes: ['golden', 'contrast', 'anti-collapse', 'integration'].filter(
        fixtureClass => !observed.fixture_classes.has(fixtureClass)
      ),
      single_fixture_ids: Array.from(observed.single_fixture_ids).sort(),
      contrast_fixture_ids: Array.from(observed.contrast_fixture_ids).sort(),
      enforced_fixture_ids: Array.from(observed.enforced_fixture_ids).sort(),
      failing_enforced_fixture_ids: Array.from(observed.failing_enforced_fixture_ids).sort(),
      hard_gated_phase0: Array.from(observed.enforced_fixture_ids).length > 0,
      hard_gated_failures: Array.from(observed.failing_enforced_fixture_ids).length,
      has_complete_fixture_class_set: false,
    });
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
    rowFixtures.sort((left, right) =>
      String(left.id || '').localeCompare(String(right.id || ''))
    );
  }

  return rowMap;
}

function evaluateRowPromotionGates(coverageRows = [], fixtures = [], crossPhaseChecks = {}) {
  const rowFixtureMap = buildRowFixtureMap(fixtures);
  const globalCrossPhasePass =
    !!crossPhaseChecks?.determinism?.pass &&
    (crossPhaseChecks?.seed_checks || []).every(check => check.pass);
  const oldRuntimeIndependencePass = false;
  const blockerCounts = {};

  const rows = coverageRows.map(row => {
    const rowFixtures = rowFixtureMap.get(row.row) || [];
    const contrastFixtures = rowFixtures.filter(fixture => fixture.kind === 'contrast');
    const passingContrastFixtures = contrastFixtures.filter(
      fixture => !fixture.hard_gated_failure && (fixture.divergence_invariants?.failed || 0) === 0
    );
    const outputAssertionFixtures = rowFixtures.filter(
      fixture => Array.isArray(fixture.path_checks) && fixture.path_checks.length > 0
    );
    const passingOutputAssertionFixtures = outputAssertionFixtures.filter(fixture =>
      fixture.path_checks.every(check => check.exists)
    );

    const checks = {
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
        pass: passingContrastFixtures.length > 0,
        fixture_ids: passingContrastFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
      },
      invariant_pass: {
        pass:
          row.has_executable_row_local_suite_checks &&
          row.failed_row_local_suite_check_count === 0 &&
          globalCrossPhasePass,
        row_local_suite_pass:
          row.has_executable_row_local_suite_checks &&
          row.failed_row_local_suite_check_count === 0,
        cross_phase_pass: globalCrossPhasePass,
      },
      public_path_proof: {
        pass: row.observed_fixture_classes.includes('integration'),
        observed_fixture_classes: row.observed_fixture_classes,
      },
      exposed_output_contract: {
        pass: passingOutputAssertionFixtures.length > 0,
        fixture_ids: passingOutputAssertionFixtures.map(fixture => fixture.id || '(unknown-fixture)'),
      },
      non_collapse_proof: {
        pass:
          row.observed_fixture_classes.includes('anti-collapse') && row.hard_gated_failures === 0,
        observed_fixture_classes: row.observed_fixture_classes,
        hard_gated_failures: row.hard_gated_failures,
      },
      old_runtime_independence: {
        pass: oldRuntimeIndependencePass,
        status: 'unproven-in-phase0-audit',
      },
      evidence_bundle_present: {
        pass:
          row.single_fixture_ids.length > 0 &&
          row.contrast_fixture_ids.length > 0 &&
          row.row_local_suite_count > 0 &&
          outputAssertionFixtures.length > 0,
        single_fixture_ids: row.single_fixture_ids,
        contrast_fixture_ids: row.contrast_fixture_ids,
        row_local_suite_ids: row.row_local_suite_ids,
        output_assertion_fixture_ids: outputAssertionFixtures.map(
          fixture => fixture.id || '(unknown-fixture)'
        ),
      },
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value.pass !== true)
      .map(([key]) => key)
      .sort();

    for (const blocker of blockers) {
      blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1;
    }

    return {
      ...row,
      promotion_checks: checks,
      full_contract_eligible: blockers.length === 0,
      promotion_blockers: blockers,
      promotion_state: blockers.length === 0 ? 'full-contract-eligible' : 'not-yet-full',
    };
  });

  const fullContractEligibleRows = rows
    .filter(row => row.full_contract_eligible)
    .map(row => row.row)
    .sort();

  return {
    rows,
    summary: {
      total_rows: rows.length,
      full_contract_eligible_rows: fullContractEligibleRows.length,
      not_yet_eligible_rows: rows.length - fullContractEligibleRows.length,
      full_contract_eligible_row_ids: fullContractEligibleRows,
      blocker_counts: blockerCounts,
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
      const pathChecks = (fixture.assertions || [])
        .filter(assertion => assertion.startsWith('path_exists:'))
        .map(assertion => {
          const checkPath = assertion.slice('path_exists:'.length);
          return {
            path: checkPath,
            exists: getAtPath(solved, checkPath) !== undefined,
          };
        });

      if (!validation.ok || !determinism.pass) hardFailure = true;

      report.fixtures.push({
        fixture_pack: fixturePack,
        file: manifest.file,
        id: fixture.id,
        row: fixture.row,
        kind: fixture.kind,
        fixture_class: fixtureClass,
        validation: summarizeValidation(validation),
        solve_ok: !!solved,
        determinism,
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
      const determinismA = evaluateDeterminism(caseA);
      const determinismB = evaluateDeterminism(caseB);

      if (!validationA.ok || !validationB.ok || !determinismA.pass || !determinismB.pass) {
        hardFailure = true;
      }

      const comparisons = comparePaths(solvedA, solvedB, fixture.compare_paths || []);
      const differsSomewhere = comparisons.some(item => item.differs);
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
        validation_a: summarizeValidation(validationA),
        validation_b: summarizeValidation(validationB),
        determinism_a: determinismA,
        determinism_b: determinismB,
        differs_somewhere: differsSomewhere,
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
      error: `Unsupported fixture kind: ${fixture.kind}`,
    });
  }
}

report.cross_phase_invariant_checks = evaluateExecutableCrossPhaseInvariants(report.fixtures, invariantRegistry);
report.cross_phase_invariant_check_summary = summarizeExecutableCrossPhaseInvariantChecks(
  report.cross_phase_invariant_checks
);

if (report.cross_phase_invariant_checks.determinism?.failed_fixtures > 0) {
  hardFailure = true;
}
if ((report.cross_phase_invariant_checks.seed_checks || []).some(check => !check.pass)) {
  hardFailure = true;
}

report.row_local_suite_checks = evaluateExecutableRowLocalSuiteChecks(report.fixtures, invariantRegistry);
report.row_local_suite_check_summary = summarizeExecutableRowLocalSuiteChecks(report.row_local_suite_checks);

if (report.row_local_suite_check_summary.failed_checks > 0) {
  hardFailure = true;
}

report.coverage_rows = buildCoverageRows(
  coverageRowDeclarations,
  report.fixtures,
  invariantRegistry,
  report.row_local_suite_checks
);

const promotionEvaluation = evaluateRowPromotionGates(
  report.coverage_rows,
  report.fixtures,
  report.cross_phase_invariant_checks
);
report.coverage_rows = promotionEvaluation.rows;
report.promotion_gate_summary = promotionEvaluation.summary;
report.coverage_summary = summarizeCoverageRows(report.coverage_rows);

console.log(JSON.stringify(report, null, 2));

if (hardFailure) {
  process.exitCode = 1;
}
