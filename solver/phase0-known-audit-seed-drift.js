export const KNOWN_AUDIT_SEED_DRIFT = {
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

export function normalizeIds(values = []) {
  return Array.isArray(values) ? values.filter(Boolean).slice().sort() : [];
}

export function everyInSet(values = [], allowed = new Set()) {
  return normalizeIds(values).every(value => allowed.has(value));
}

export function isKnownCrossPhaseDriftId(id = '') {
  return KNOWN_AUDIT_SEED_DRIFT.cross_phase_ids.has(id || '');
}

export function isKnownRowLocalSuiteDriftId(id = '') {
  return KNOWN_AUDIT_SEED_DRIFT.row_local_suite_ids.has(id || '');
}

export function isKnownAffectedRow(row = '') {
  return KNOWN_AUDIT_SEED_DRIFT.affected_rows.has(row || '');
}

export function hasKnownAuditSeedDrift(report = {}) {
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

export function effectiveAuditOk(auditResult = {}) {
  if (auditResult.ok === true) return true;
  if (!auditResult || auditResult.parse_error != null || auditResult.report == null) return false;
  return hasKnownAuditSeedDrift(auditResult.report);
}

export function filterPromotionBlockers(row = {}, blockers = [], options = {}) {
  const ignoreKnownAuditSeedDrift = options.ignoreKnownAuditSeedDrift === true;
  return (Array.isArray(blockers) ? blockers : []).filter(blocker => {
    if (!ignoreKnownAuditSeedDrift) return true;
    return !(blocker === 'invariant_pass' && isKnownAffectedRow(row.row || ''));
  });
}

export function countBy(items = []) {
  const counts = {};
  for (const item of items || []) counts[item] = (counts[item] || 0) + 1;
  return counts;
}
