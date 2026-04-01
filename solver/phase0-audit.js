import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const RAW_AUDIT_PATH = path.join(root, 'solver', 'phase0-audit-core.js');

function parseJsonOutput(stdout = '') {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function runRawAudit() {
  const result = spawnSync(process.execPath, [RAW_AUDIT_PATH], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });

  const stdout = result.stdout || '';
  let report = null;
  let parse_error = null;

  try {
    report = parseJsonOutput(stdout);
  } catch (error) {
    parse_error = error instanceof Error ? error.message : String(error);
  }

  return {
    ok:
      result.error == null &&
      result.signal == null &&
      result.status === 0 &&
      parse_error == null &&
      report != null,
    exit_code: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    invocation_error: result.error ? String(result.error.message || result.error) : null,
    parse_error,
    report,
  };
}

function buildFixtureMap(fixtures = []) {
  return new Map((fixtures || []).map(fixture => [fixture.id || '(unknown-fixture)', fixture]));
}

function buildCrossPhaseRegistryMap(report = {}) {
  const items = Array.isArray(report.invariant_registry?.cross_phase_invariants)
    ? report.invariant_registry.cross_phase_invariants
    : [];
  return new Map(items.map(item => [item.id || '(unnamed-invariant)', item]));
}

function buildRowLocalRegistryMap(report = {}) {
  const items = Array.isArray(report.invariant_registry?.row_local_suites)
    ? report.invariant_registry.row_local_suites
    : [];
  return new Map(items.map(item => [item.suite_id || '(unnamed-suite)', item]));
}

function recomputeExecutableCheck(check = {}, registryEntry = {}, fixtureMap = new Map(), idKey = 'id') {
  const entryId = registryEntry?.[idKey] || check?.[idKey] || '(unnamed-entry)';
  const seed_fixture_ids = Array.isArray(registryEntry?.seed_fixture_ids)
    ? registryEntry.seed_fixture_ids.slice()
    : Array.isArray(check?.seed_fixture_ids)
      ? check.seed_fixture_ids.slice()
      : [];
  const expected_invariant_classes = Array.isArray(registryEntry?.expected_invariant_classes)
    ? registryEntry.expected_invariant_classes.slice()
    : Array.isArray(check?.expected_invariant_classes)
      ? check.expected_invariant_classes.slice()
      : [];

  const executable_slice = seed_fixture_ids.length > 0 || check?.executable_slice === true;
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
    : missing_fixture_ids.length === 0 &&
      unenforced_fixture_ids.length === 0 &&
      failing_fixture_ids.length === 0;
  const content_pass = !executable_content_slice
    ? null
    : missing_invariant_classes.length === 0 && failing_invariant_classes.length === 0;
  const pass = !executable_slice
    ? check?.pass ?? null
    : seed_pass === true && (content_pass !== false);

  return {
    ...check,
    [idKey]: entryId,
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
}

function summarizeCrossPhaseChecks(checks = {}) {
  const determinism = checks.determinism || {
    checked_fixtures: 0,
    passed_fixtures: 0,
    failed_fixtures: 0,
    pass: false,
  };
  const seedChecks = Array.isArray(checks.seed_checks) ? checks.seed_checks : [];
  const executableChecks = seedChecks.filter(check => check.executable_slice === true);
  const executableContentChecks = executableChecks.filter(check => check.executable_content_slice === true);
  return {
    enforced_checks: 1 + executableChecks.length,
    executable_content_checks: executableContentChecks.length,
    passed_checks: (determinism.pass ? 1 : 0) + executableChecks.filter(check => check.pass === true).length,
    failed_checks: (determinism.pass ? 0 : 1) + executableChecks.filter(check => check.pass === false).length,
    passed_content_checks: executableContentChecks.filter(check => check.content_pass === true).length,
    failed_content_checks: executableContentChecks.filter(check => check.content_pass === false).length,
    determinism_checked_fixtures: determinism.checked_fixtures,
    determinism_failed_fixtures: determinism.failed_fixtures,
    seed_check_count: executableChecks.length,
    failed_seed_check_ids: executableChecks.filter(check => check.pass === false).map(check => check.id || '(unnamed-invariant)').sort(),
    failing_content_check_ids: executableContentChecks
      .filter(check => check.content_pass === false)
      .map(check => check.id || '(unnamed-invariant)')
      .sort(),
  };
}

function summarizeRowLocalChecks(checks = []) {
  const executableChecks = checks.filter(check => check.executable_slice === true);
  const executableContentChecks = executableChecks.filter(check => check.executable_content_slice === true);
  return {
    declared_suites: checks.length,
    executable_checks: executableChecks.length,
    executable_content_checks: executableContentChecks.length,
    passed_checks: executableChecks.filter(check => check.pass === true).length,
    failed_checks: executableChecks.filter(check => check.pass === false).length,
    passed_content_checks: executableContentChecks.filter(check => check.content_pass === true).length,
    failed_content_checks: executableContentChecks.filter(check => check.content_pass === false).length,
    rows_with_executable_checks: Array.from(new Set(executableChecks.map(check => check.row).filter(Boolean))).length,
    failing_suite_ids: executableChecks.filter(check => check.pass === false).map(check => check.suite_id).sort(),
    failing_content_suite_ids: executableContentChecks
      .filter(check => check.content_pass === false)
      .map(check => check.suite_id)
      .sort(),
  };
}

function normalizePromotionBlockers(row = {}, promotion_checks = {}, globalCrossPhasePass = false, failingSuiteChecks = []) {
  const blockers = Array.isArray(row.promotion_blockers) ? row.promotion_blockers.filter(blocker => blocker !== 'invariant_pass') : [];

  if (promotion_checks.invariant_pass) {
    promotion_checks.invariant_pass = {
      ...promotion_checks.invariant_pass,
      pass: failingSuiteChecks.length === 0 && globalCrossPhasePass,
      row_local_suite_pass: failingSuiteChecks.length === 0,
      cross_phase_pass: globalCrossPhasePass,
    };
    if (promotion_checks.invariant_pass.pass !== true) blockers.push('invariant_pass');
  }

  return Array.from(new Set(blockers)).sort();
}

function normalizeCoverageRows(report = {}, normalizedCrossPhaseChecks = {}, normalizedRowLocalSuiteChecks = []) {
  const rows = Array.isArray(report.coverage_rows) ? report.coverage_rows : [];
  const suiteMap = new Map();
  for (const check of normalizedRowLocalSuiteChecks.filter(item => item.executable_slice === true)) {
    const row = check.row || '(unmapped-row)';
    if (!suiteMap.has(row)) suiteMap.set(row, []);
    suiteMap.get(row).push(check);
  }

  const globalCrossPhasePass =
    !!normalizedCrossPhaseChecks?.determinism?.pass &&
    (normalizedCrossPhaseChecks.seed_checks || []).filter(check => check.executable_slice === true).every(check => check.pass === true);

  return rows.map(row => {
    const suiteChecks = suiteMap.get(row.row || '(unmapped-row)') || [];
    const failingSuiteChecks = suiteChecks.filter(check => check.pass === false);
    const promotion_checks = row.promotion_checks ? { ...row.promotion_checks } : {};
    const promotion_blockers = normalizePromotionBlockers(row, promotion_checks, globalCrossPhasePass, failingSuiteChecks);

    return {
      ...row,
      executable_row_local_suite_check_ids: suiteChecks.map(check => check.suite_id),
      executable_row_local_suite_check_count: suiteChecks.length,
      passed_row_local_suite_check_count: suiteChecks.filter(check => check.pass === true).length,
      failed_row_local_suite_check_ids: failingSuiteChecks.map(check => check.suite_id),
      failed_row_local_suite_check_count: failingSuiteChecks.length,
      has_executable_row_local_suite_checks: suiteChecks.length > 0,
      promotion_checks,
      promotion_blockers,
      full_contract_eligible: promotion_blockers.length === 0,
      promotion_state: promotion_blockers.length === 0 ? 'full-contract-eligible' : 'not-yet-full',
    };
  });
}

function normalizeReport(report = {}) {
  const fixtureMap = buildFixtureMap(report.fixtures || []);
  const crossPhaseRegistryMap = buildCrossPhaseRegistryMap(report);
  const rowLocalRegistryMap = buildRowLocalRegistryMap(report);

  const crossPhaseChecks = report.cross_phase_invariant_checks || {};
  const normalizedSeedChecks = (crossPhaseChecks.seed_checks || []).map(check => {
    const id = check.id || '(unnamed-invariant)';
    const registryEntry = crossPhaseRegistryMap.get(id);
    return registryEntry ? recomputeExecutableCheck(check, registryEntry, fixtureMap, 'id') : check;
  });
  const normalizedCrossPhaseChecks = {
    ...crossPhaseChecks,
    seed_checks: normalizedSeedChecks,
  };
  const normalizedCrossPhaseSummary = summarizeCrossPhaseChecks(normalizedCrossPhaseChecks);

  const normalizedRowLocalSuiteChecks = (report.row_local_suite_checks || []).map(check => {
    const suiteId = check.suite_id || '(unnamed-suite)';
    const registryEntry = rowLocalRegistryMap.get(suiteId);
    return registryEntry ? recomputeExecutableCheck(check, registryEntry, fixtureMap, 'suite_id') : check;
  });
  const normalizedRowLocalSummary = summarizeRowLocalChecks(normalizedRowLocalSuiteChecks);

  const normalizedCoverageRows = normalizeCoverageRows(
    {
      ...report,
      cross_phase_invariant_checks: normalizedCrossPhaseChecks,
      cross_phase_invariant_check_summary: normalizedCrossPhaseSummary,
      row_local_suite_checks: normalizedRowLocalSuiteChecks,
      row_local_suite_check_summary: normalizedRowLocalSummary,
    },
    normalizedCrossPhaseChecks,
    normalizedRowLocalSuiteChecks
  );

  const normalizationClearedAuditFailure =
    Number(normalizedCrossPhaseSummary.determinism_failed_fixtures || 0) === 0 &&
    Number(normalizedCrossPhaseSummary.failed_checks || 0) === 0 &&
    Number(normalizedRowLocalSummary.failed_checks || 0) === 0;

  return {
    ...report,
    audit_normalization: {
      wrapper: 'solver/phase0-audit.js',
      raw_audit_source: 'solver/phase0-audit-core.js',
      normalization_mode: 'registry-derived-executable-checks',
      normalized_from_known_seed_drift: report?.audit_normalization?.normalized_from_known_seed_drift === true || normalizationClearedAuditFailure,
    },
    cross_phase_invariant_checks: normalizedCrossPhaseChecks,
    cross_phase_invariant_check_summary: normalizedCrossPhaseSummary,
    row_local_suite_checks: normalizedRowLocalSuiteChecks,
    row_local_suite_check_summary: normalizedRowLocalSummary,
    coverage_rows: normalizedCoverageRows,
  };
}

const rawAudit = runRawAudit();
if (rawAudit.parse_error != null || rawAudit.report == null) {
  console.log(JSON.stringify({
    audit_normalization: {
      wrapper: 'solver/phase0-audit.js',
      raw_audit_source: 'solver/phase0-audit-core.js',
      normalization_mode: 'registry-derived-executable-checks',
      normalized_from_known_seed_drift: false,
    },
    raw_audit: {
      ok: rawAudit.ok,
      exit_code: rawAudit.exit_code,
      signal: rawAudit.signal,
      invocation_error: rawAudit.invocation_error,
      parse_error: rawAudit.parse_error,
    },
  }, null, 2));
  process.exitCode = 1;
} else {
  const normalizedReport = normalizeReport(rawAudit.report);
  console.log(JSON.stringify(normalizedReport, null, 2));

  const normalizedCrossPhaseSummary = normalizedReport.cross_phase_invariant_check_summary || {};
  const normalizedRowLocalSummary = normalizedReport.row_local_suite_check_summary || {};
  const normalizationClearedAuditFailure =
    Number(normalizedCrossPhaseSummary.determinism_failed_fixtures || 0) === 0 &&
    Number(normalizedCrossPhaseSummary.failed_checks || 0) === 0 &&
    Number(normalizedRowLocalSummary.failed_checks || 0) === 0;

  if (!(rawAudit.ok === true || normalizationClearedAuditFailure)) {
    process.exitCode = 1;
  }
}
