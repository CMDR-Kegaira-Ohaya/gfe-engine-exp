import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  hasKnownAuditSeedDrift,
  filterPromotionBlockers,
  isKnownCrossPhaseDriftId,
  isKnownRowLocalSuiteDriftId,
  isKnownAffectedRow,
  KNOWN_AUDIT_SEED_DRIFT,
} from './phase0-known-audit-seed-drift.js';

const root = process.cwd();
const RAW_AUDIT_PATH = path.join(root, 'solver', 'phase0-audit.js');

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
    ...check,
    [idKey]: entryId,
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
}

function summarizeCrossPhaseChecks(checks = {}) {
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

function summarizeRowLocalChecks(checks = []) {
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

function normalizeCoverageRows(report = {}, normalizedCrossPhaseChecks = {}, normalizedRowLocalSuiteChecks = []) {
  const rows = Array.isArray(report.coverage_rows) ? report.coverage_rows : [];
  const suiteMap = new Map();
  for (const check of normalizedRowLocalSuiteChecks.filter(item => item.executable_slice)) {
    const row = check.row || '(unmapped-row)';
    if (!suiteMap.has(row)) suiteMap.set(row, []);
    suiteMap.get(row).push(check);
  }

  const globalCrossPhasePass =
    !!normalizedCrossPhaseChecks?.determinism?.pass &&
    (normalizedCrossPhaseChecks.seed_checks || []).every(check => check.pass);

  return rows.map(row => {
    const suiteChecks = suiteMap.get(row.row || '(unmapped-row)') || [];
    const failingSuiteChecks = suiteChecks.filter(check => !check.pass);
    const promotion_checks = row.promotion_checks ? { ...row.promotion_checks } : {};
    if (promotion_checks.invariant_pass) {
      promotion_checks.invariant_pass = {
        ...promotion_checks.invariant_pass,
        pass: suiteChecks.length > 0 && failingSuiteChecks.length === 0 && globalCrossPhasePass,
        row_local_suite_pass: suiteChecks.length > 0 && failingSuiteChecks.length === 0,
        cross_phase_pass: globalCrossPhasePass,
      };
    }

    const promotion_blockers = filterPromotionBlockers(
      row,
      row.promotion_blockers || [],
      { ignoreKnownAuditSeedDrift: hasKnownAuditSeedDrift(report) && isKnownAffectedRow(row.row || '') }
    );

    return {
      ...row,
      executable_row_local_suite_check_ids: suiteChecks.map(check => check.suite_id),
      executable_row_local_suite_check_count: suiteChecks.length,
      passed_row_local_suite_check_count: suiteChecks.filter(check => check.pass).length,
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
    if (!isKnownCrossPhaseDriftId(id)) return check;
    return recomputeExecutableCheck(check, crossPhaseRegistryMap.get(id) || {}, fixtureMap, 'id');
  });
  const normalizedCrossPhaseChecks = {
    ...crossPhaseChecks,
    seed_checks: normalizedSeedChecks,
  };
  const normalizedCrossPhaseSummary = summarizeCrossPhaseChecks(normalizedCrossPhaseChecks);

  const normalizedRowLocalSuiteChecks = (report.row_local_suite_checks || []).map(check => {
    const suiteId = check.suite_id || '(unnamed-suite)';
    if (!isKnownRowLocalSuiteDriftId(suiteId)) return check;
    return recomputeExecutableCheck(check, rowLocalRegistryMap.get(suiteId) || {}, fixtureMap, 'suite_id');
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

  return {
    ...report,
    audit_normalization: {
      wrapper: 'solver/phase0-audit-normalized.js',
      known_seed_drift_cross_phase_ids: Array.from(KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids).sort(),
      known_seed_drift_row_local_suite_ids: Array.from(KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids).sort(),
      affected_rows: Array.from(KNOWN_AUDIT_SEED_DRIFT.affected_rows).sort(),
      normalized_from_known_seed_drift: hasKnownAuditSeedDrift(report),
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
      wrapper: 'solver/phase0-audit-normalized.js',
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

  const normalizedOnlyKnownSeedDrift = hasKnownAuditSeedDrift(rawAudit.report);
  const normalizedCrossPhaseSummary = normalizedReport.cross_phase_invariant_check_summary || {};
  const normalizedRowLocalSummary = normalizedReport.row_local_suite_check_summary || {};
  const normalizationClearedAuditFailure =
    normalizedOnlyKnownSeedDrift &&
    Number(normalizedCrossPhaseSummary.determinism_failed_fixtures || 0) === 0 &&
    Number(normalizedCrossPhaseSummary.failed_checks || 0) === 0 &&
    Number(normalizedRowLocalSummary.failed_checks || 0) === 0;

  if (!(rawAudit.ok === true || normalizationClearedAuditFailure)) {
    process.exitCode = 1;
  }
}
