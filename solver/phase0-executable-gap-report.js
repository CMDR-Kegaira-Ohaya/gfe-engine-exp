import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const AUDIT_PATH = path.join(root, 'solver', 'phase0-audit-normalized.js');
const GOLDEN_SWEEP_BLOCKERS = new Set(['missing_declared_fixture_classes']);

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

function summarizePromotionRow(row = {}) {
  const promotion_blockers = Array.isArray(row.promotion_blockers) ? row.promotion_blockers : [];
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
const report = audit.report || {};
const crossPhaseChecks = Array.isArray(report.cross_phase_invariant_checks?.seed_checks)
  ? report.cross_phase_invariant_checks.seed_checks
  : [];
const rowLocalSuiteChecks = Array.isArray(report.row_local_suite_checks) ? report.row_local_suite_checks : [];
const promotionRows = Array.isArray(report.coverage_rows) ? report.coverage_rows : [];

const failingCrossPhaseSeedChecks = crossPhaseChecks
  .filter(check => check.pass !== true)
  .map(summarizeSeedCheck)
  .sort((left, right) => String(left.id).localeCompare(String(right.id)));

const failingRowLocalSuiteChecks = rowLocalSuiteChecks
  .filter(check => check.executable_slice === true && check.pass !== true)
  .map(summarizeSuiteCheck)
  .sort((left, right) => String(left.suite_id).localeCompare(String(right.suite_id)));

const blockedPromotionRows = promotionRows
  .map(summarizePromotionRow)
  .filter(row => row.non_golden_blockers.length > 0)
  .sort((left, right) => {
    if (right.non_golden_blockers.length !== left.non_golden_blockers.length) {
      return right.non_golden_blockers.length - left.non_golden_blockers.length;
    }
    return String(left.row).localeCompare(String(right.row));
  });

const reportOut = {
  audit: {
    raw_ok: audit.ok,
    effective_ok: audit.ok,
    exit_code: audit.exit_code,
    signal: audit.signal,
    invocation_error: audit.invocation_error,
    parse_error: audit.parse_error,
  },
  audit_normalization: report.audit_normalization || {
    wrapper: 'solver/phase0-audit-normalized.js',
    normalized_from_known_seed_drift: false,
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
  !audit.ok ||
  failingCrossPhaseSeedChecks.length > 0 ||
  failingRowLocalSuiteChecks.length > 0 ||
  blockedPromotionRows.length > 0
) {
  process.exitCode = 1;
}
