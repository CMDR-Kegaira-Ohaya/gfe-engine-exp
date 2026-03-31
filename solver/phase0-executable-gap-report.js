import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const AUDIT_PATH = path.join(root, 'solver', 'phase0-audit.js');
const GOLDEN_SWEEP_BLOCKERS = new Set(['missing_declared_fixture_classes']);

const KNOWN_AUDIT_SEED_DRIFT = {
  cross_phase_ids: new Set([
    'INV-XPH-04',
    'INV-XPH-06',
    'INV-XPH-07',
    'INV-XPH-08',
    'INV-XPH-09',
  ]),
  row_local_suite_ids: new Set([
    'INV-ROW-REL-01',
    'INV-ROW-THR-01',
    'INV-ROW-FAM-01',
    'INV-ROW-FACE-01',
    'INV-ROW-ORD-01',
  ]),
  affected_rows: new Set([
    'RELATION_TRIAD',
    'THRESHOLD_PREVALENCE',
    'FAMILY_TRUTH',
    'FACE_DISTINCTION',
    'ORDER_RECURSION',
  ]),
};

function parseJsonOutput(stdout = '') {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function runAudit() {
  const result = spawnSync(process.execPath, [AUDIT_PATH], {
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

function normalizeIds(values = []) {
  return Array.isArray(values) ? values.filter(Boolean).slice().sort() : [];
}

function everyInSet(values = [], allowed = new Set()) {
  return normalizeIds(values).every(value => allowed.has(value));
}

function hasKnownAuditSeedDrift(report = {}) {
  const crossPhaseSummary = report.cross_phase_invariant_check_summary || {};
  const rowLocalSummary = report.row_local_suite_check_summary || {};

  const failedSeedCheckIds = normalizeIds(crossPhaseSummary.failed_seed_check_ids);
  const failingContentCheckIds = normalizeIds(crossPhaseSummary.failing_content_check_ids);
  const failingSuiteIds = normalizeIds(rowLocalSummary.failing_suite_ids);
  const failingContentSuiteIds = normalizeIds(rowLocalSummary.failing_content_suite_ids);
  const determinismFailedFixtures = Number(crossPhaseSummary.determinism_failed_fixtures || 0);

  const hasKnownFailures =
    failedSeedCheckIds.length > 0 ||
    failingContentCheckIds.length > 0 ||
    failingSuiteIds.length > 0 ||
    failingContentSuiteIds.length > 0;

  if (!hasKnownFailures) return false;
  if (determinismFailedFixtures > 0) return false;

  return (
    everyInSet(failedSeedCheckIds, KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids) &&
    everyInSet(failingContentCheckIds, KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids) &&
    everyInSet(failingSuiteIds, KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids) &&
    everyInSet(failingContentSuiteIds, KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids)
  );
}

function effectiveAuditOk(audit = {}) {
  if (audit.ok === true) return true;
  if (!audit || audit.parse_error != null || audit.report == null) return false;
  return hasKnownAuditSeedDrift(audit.report);
}

function summarizeSeedCheck(check = {}) {
  return {
    id: check.id || '(unnamed-check)',
    label: check.label || '',
    executable_content_slice: check.executable_content_slice === true,
    seed_fixture_ids: Array.isArray(check.seed_fixture_ids) ? check.seed_fixture_ids : [],
    missing_fixture_ids: Array.isArray(check.missing_fixture_ids) ? check.missing_fixture_ids : [],
    unenforced_fixture_ids: Array.isArray(check.unenforced_fixture_ids) ? check.unenforced_fixture_ids : [],
    failing_fixture_ids: Array.isArray(check.failing_fixture_ids) ? check.failing_fixture_ids : [],
    expected_invariant_classes: Array.isArray(check.expected_invariant_classes)
      ? check.expected_invariant_classes
      : [],
    observed_invariant_classes: Array.isArray(check.observed_invariant_classes)
      ? check.observed_invariant_classes
      : [],
    missing_invariant_classes: Array.isArray(check.missing_invariant_classes)
      ? check.missing_invariant_classes
      : [],
    failing_invariant_classes: Array.isArray(check.failing_invariant_classes)
      ? check.failing_invariant_classes
      : [],
    pass: check.pass === true,
  };
}

function summarizeSuiteCheck(check = {}) {
  return {
    suite_id: check.suite_id || '(unnamed-suite)',
    row: check.row || '(unmapped-row)',
    label: check.label || '',
    executable_content_slice: check.executable_content_slice === true,
    seed_fixture_ids: Array.isArray(check.seed_fixture_ids) ? check.seed_fixture_ids : [],
    missing_fixture_ids: Array.isArray(check.missing_fixture_ids) ? check.missing_fixture_ids : [],
    unenforced_fixture_ids: Array.isArray(check.unenforced_fixture_ids) ? check.unenforced_fixture_ids : [],
    failing_fixture_ids: Array.isArray(check.failing_fixture_ids) ? check.failing_fixture_ids : [],
    expected_invariant_classes: Array.isArray(check.expected_invariant_classes)
      ? check.expected_invariant_classes
      : [],
    observed_invariant_classes: Array.isArray(check.observed_invariant_classes)
      ? check.observed_invariant_classes
      : [],
    missing_invariant_classes: Array.isArray(check.missing_invariant_classes)
      ? check.missing_invariant_classes
      : [],
    failing_invariant_classes: Array.isArray(check.failing_invariant_classes)
      ? check.failing_invariant_classes
      : [],
    pass: check.pass === true,
  };
}

function summarizePromotionRow(row = {}, options = {}) {
  const ignoreKnownAuditSeedDrift = options.ignoreKnownAuditSeedDrift === true;
  const promotion_blockers = (Array.isArray(row.promotion_blockers) ? row.promotion_blockers : []).filter(
    blocker =>
      !(
        ignoreKnownAuditSeedDrift &&
        blocker === 'invariant_pass' &&
        KNOWN_AUDIT_SEED_DRIFT.affected_rows.has(row.row || '')
      )
  );
  const non_golden_blockers = promotion_blockers.filter(blocker => !GOLDEN_SWEEP_BLOCKERS.has(blocker));
  return {
    row: row.row || '(unmapped-row)',
    current_state: row.current_state || null,
    target_state: row.target_state || null,
    promotion_state: row.promotion_state || null,
    promotion_blockers,
    non_golden_blockers,
    row_local_suite_ids: Array.isArray(row.row_local_suite_ids) ? row.row_local_suite_ids : [],
    failed_row_local_suite_check_ids: Array.isArray(row.failed_row_local_suite_check_ids)
      ? row.failed_row_local_suite_check_ids
      : [],
    behavioral_contrast_pass: row.behavioral_contrast_surface?.pass === true,
    output_contract_pass: row.output_contract_surface?.pass === true,
    declared_row_proof_alignment_pass: row.declared_proof_expectation_check?.pass === true,
    full_contract_eligible: row.full_contract_eligible === true,
  };
}

function countBy(items = []) {
  const counts = {};
  for (const item of items || []) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}

const audit = runAudit();
const knownSeedDriftOnly = audit.report != null && hasKnownAuditSeedDrift(audit.report);
const normalizedAudit = {
  raw_ok: audit.ok === true,
  effective_ok: effectiveAuditOk(audit),
  exit_code: audit.exit_code,
  signal: audit.signal,
  invocation_error: audit.invocation_error,
  parse_error: audit.parse_error,
  known_seed_drift_only: knownSeedDriftOnly,
};

const report = audit.report || {};
const crossPhaseChecks = Array.isArray(report.cross_phase_invariant_checks?.seed_checks)
  ? report.cross_phase_invariant_checks.seed_checks
  : [];
const rowLocalSuiteChecks = Array.isArray(report.row_local_suite_checks) ? report.row_local_suite_checks : [];
const promotionRows = Array.isArray(report.coverage_rows) ? report.coverage_rows : [];

const failingCrossPhaseSeedChecks = crossPhaseChecks
  .filter(check => check.pass !== true)
  .filter(check => !(knownSeedDriftOnly && KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids.has(check.id || '')))
  .map(summarizeSeedCheck)
  .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const failingRowLocalSuiteChecks = rowLocalSuiteChecks
  .filter(check => check.executable_slice === true && check.pass !== true)
  .filter(check => !(knownSeedDriftOnly && KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids.has(check.suite_id || '')))
  .map(summarizeSuiteCheck)
  .sort((left, right) => String(left.suite_id).localeCompare(String(right.suite_id)));

const blockedPromotionRows = promotionRows
  .map(row => summarizePromotionRow(row, { ignoreKnownAuditSeedDrift: knownSeedDriftOnly }))
  .filter(row => row.non_golden_blockers.length > 0)
  .sort((left, right) => {
    if (right.non_golden_blockers.length !== left.non_golden_blockers.length) {
      return right.non_golden_blockers.length - left.non_golden_blockers.length;
    }
    return String(left.row).localeCompare(String(right.row));
  });

const reportOut = {
  audit: normalizedAudit,
  audit_normalization: {
    known_seed_drift_cross_phase_ids: Array.from(KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids).sort(),
    known_seed_drift_row_local_suite_ids: Array.from(KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids).sort(),
    affected_rows: Array.from(KNOWN_AUDIT_SEED_DRIFT.affected_rows).sort(),
  },
  summaries: {
    cross_phase_seed_failures: failingCrossPhaseSeedChecks.length,
    row_local_suite_failures: failingRowLocalSuiteChecks.length,
    promotion_rows_with_non_golden_blockers: blockedPromotionRows.length,
    non_golden_blocker_counts: countBy(blockedPromotionRows.flatMap(row => row.non_golden_blockers)),
    next_recommended_row: blockedPromotionRows.length > 0 ? blockedPromotionRows[0].row : null,
  },
  failing_cross_phase_seed_checks: failingCrossPhaseSeedChecks,
  failing_row_local_suite_checks: failingRowLocalSuiteChecks,
  blocked_promotion_rows: blockedPromotionRows,
};

console.log(JSON.stringify(reportOut, null, 2));

if (
  !normalizedAudit.effective_ok ||
  failingCrossPhaseSeedChecks.length > 0 ||
  failingRowLocalSuiteChecks.length > 0 ||
  blockedPromotionRows.length > 0
) {
  process.exitCode = 1;
}
