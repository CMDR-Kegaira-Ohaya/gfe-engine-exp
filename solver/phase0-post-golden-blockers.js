import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const AUDITS = [
  {
    id: 'phase0_audit',
    path: path.join(root, 'solver', 'phase0-audit.js'),
    cwd: root,
  },
  {
    id: 'phase0_proof_expectations_audit',
    path: path.join(root, 'solver', 'phase0-proof-expectations-audit.js'),
    cwd: root,
  },
  {
    id: 'phase0_contract_preflight',
    path: path.join(root, 'solver', 'phase0-contract-preflight.js'),
    cwd: root,
  },
];

const GOLDEN_SWEEP_BLOCKERS = new Set([
  'missing_declared_fixture_classes',
]);

function parseJsonOutput(stdout = '') {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

function runAudit(audit = {}) {
  const result = spawnSync(process.execPath, [audit.path], {
    cwd: audit.cwd || root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
  });

  const stdout = result.stdout || '';
  let parsed = null;
  let parse_error = null;

  try {
    parsed = parseJsonOutput(stdout);
  } catch (error) {
    parse_error = error instanceof Error ? error.message : String(error);
  }

  return {
    id: audit.id || '(unnamed-audit)',
    ok:
      result.error == null &&
      result.signal == null &&
      result.status === 0 &&
      parse_error == null &&
      parsed != null,
    exit_code: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    invocation_error: result.error ? String(result.error.message || result.error) : null,
    parse_error,
    report: parsed,
  };
}

function ensureRow(rowMap = new Map(), rowId = '(unknown-row)') {
  if (!rowMap.has(rowId)) {
    rowMap.set(rowId, {
      row: rowId,
      surfaces: {
        promotion: [],
        declaration: [],
        contract: [],
      },
      metadata: {
        current_state: null,
        target_state: null,
        promotion_state: null,
      },
      contract_fixture_classes_present: [],
      contract_missing_fixture_classes: [],
      row_local_suite_count: 0,
    });
  }
  return rowMap.get(rowId);
}

function pushUnique(items = [], values = []) {
  const seen = new Set(items);
  for (const value of values || []) {
    if (!value || seen.has(value)) continue;
    items.push(value);
    seen.add(value);
  }
  items.sort();
  return items;
}

function addPromotionSurface(rowMap = new Map(), report = {}) {
  for (const row of report.coverage_rows || []) {
    const entry = ensureRow(rowMap, row.row || '(unknown-row)');
    entry.metadata.promotion_state = row.promotion_state || null;
    entry.metadata.current_state = row.current_state || null;
    entry.metadata.target_state = row.target_state || null;
    pushUnique(entry.surfaces.promotion, row.promotion_blockers || []);
  }
}

function addDeclarationSurface(rowMap = new Map(), report = {}) {
  for (const row of report.rows || []) {
    const entry = ensureRow(rowMap, row.row || '(unknown-row)');
    const blockers = [];
    if (row.explicit_required && !row.explicit_exists) blockers.push('missing_explicit_proof_expectations');
    if ((row.missing_required_keys || []).length > 0) blockers.push('incomplete_proof_expectations_shape');
    if ((row.missing_integration_fixture_ids || []).length > 0) blockers.push('missing_integration_fixture_ids');
    if ((row.undeclared_integration_fixture_ids || []).length > 0) blockers.push('undeclared_integration_fixture_ids');
    if ((row.non_integration_fixture_ids || []).length > 0) blockers.push('nonintegration_ids_in_integration_list');
    if (row.explicit_exists && !row.canonical_entrypoint_pass) blockers.push('noncanonical_public_entrypoint_declaration');
    if (row.explicit_exists && !row.canonical_runtime_mode_pass) blockers.push('noncanonical_runtime_mode_declaration');
    if (row.explicit_required && !row.suite_requirement_pass) blockers.push('missing_required_row_local_suite');
    pushUnique(entry.surfaces.declaration, blockers);
  }
}

function addContractSurface(rowMap = new Map(), report = {}) {
  for (const row of report.contract_row_reports || []) {
    const entry = ensureRow(rowMap, row.row || '(unknown-row)');
    entry.contract_fixture_classes_present = Array.isArray(row.declared_fixture_classes_present)
      ? row.declared_fixture_classes_present.slice().sort()
      : [];
    entry.contract_missing_fixture_classes = Array.isArray(row.missing_fixture_classes)
      ? row.missing_fixture_classes.slice().sort()
      : [];
    entry.row_local_suite_count = row.row_local_suite_count || 0;
    if (entry.metadata.current_state == null) entry.metadata.current_state = row.current_state || null;
    if (entry.metadata.target_state == null) entry.metadata.target_state = row.target_state || null;
    pushUnique(entry.surfaces.contract, row.blockers || []);
  }
}

function countBy(items = []) {
  const counts = {};
  for (const item of items || []) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}

function scoreNonGoldenRow(row = {}) {
  const blockers = row.non_golden_blockers || [];
  let score = blockers.length * 5;
  if (blockers.includes('missing_row_local_suite')) score += 4;
  if (blockers.includes('missing_required_row_local_suite')) score += 4;
  if (blockers.includes('invariant_pass')) score += 3;
  if (blockers.includes('behavioral_contrast_proof')) score += 3;
  if (blockers.includes('exposed_output_contract')) score += 3;
  if (blockers.includes('declared_row_proof_alignment')) score += 2;
  return score;
}

const auditResults = Object.fromEntries(
  AUDITS.map(audit => [audit.id, runAudit(audit)])
);

const rowMap = new Map();
if (auditResults.phase0_audit?.report) addPromotionSurface(rowMap, auditResults.phase0_audit.report);
if (auditResults.phase0_proof_expectations_audit?.report) addDeclarationSurface(rowMap, auditResults.phase0_proof_expectations_audit.report);
if (auditResults.phase0_contract_preflight?.report) addContractSurface(rowMap, auditResults.phase0_contract_preflight.report);

const rows = Array.from(rowMap.values()).map(entry => {
  const promotion = entry.surfaces.promotion || [];
  const declaration = entry.surfaces.declaration || [];
  const contract = entry.surfaces.contract || [];
  const uniqueBlockers = Array.from(new Set([...promotion, ...declaration, ...contract])).sort();
  const goldenSweepBlockers = uniqueBlockers.filter(blocker => GOLDEN_SWEEP_BLOCKERS.has(blocker));
  const nonGoldenBlockers = uniqueBlockers.filter(blocker => !GOLDEN_SWEEP_BLOCKERS.has(blocker));
  const goldenClassComplete = (entry.contract_missing_fixture_classes || []).length === 0;

  return {
    row: entry.row,
    metadata: entry.metadata,
    contract_fixture_classes_present: entry.contract_fixture_classes_present,
    contract_missing_fixture_classes: entry.contract_missing_fixture_classes,
    row_local_suite_count: entry.row_local_suite_count,
    surfaces: {
      promotion,
      declaration,
      contract,
    },
    unique_blockers: uniqueBlockers,
    golden_sweep_blockers: goldenSweepBlockers,
    non_golden_blockers: nonGoldenBlockers,
    golden_class_complete: goldenClassComplete,
  };
});

rows.sort((left, right) => String(left.row).localeCompare(String(right.row)));

const rowsWithGoldenSweepGaps = rows.filter(row => row.golden_sweep_blockers.length > 0);
const rowsReadyForNonGoldenTriage = rows
  .filter(row => row.golden_class_complete)
  .map(row => ({
    ...row,
    non_golden_priority_score: scoreNonGoldenRow(row),
  }))
  .sort((left, right) => {
    if (right.non_golden_priority_score !== left.non_golden_priority_score) {
      return right.non_golden_priority_score - left.non_golden_priority_score;
    }
    if (right.non_golden_blockers.length !== left.non_golden_blockers.length) {
      return right.non_golden_blockers.length - left.non_golden_blockers.length;
    }
    return String(left.row).localeCompare(String(right.row));
  });

const remainingBlockedRows = rowsReadyForNonGoldenTriage.filter(row => row.non_golden_blockers.length > 0);
const nonGoldenBlockerCounts = countBy(
  remainingBlockedRows.flatMap(row => row.non_golden_blockers)
);

const report = {
  audits: Object.fromEntries(
    Object.entries(auditResults).map(([id, result]) => [
      id,
      {
        ok: result.ok,
        exit_code: result.exit_code,
        signal: result.signal,
        invocation_error: result.invocation_error,
        parse_error: result.parse_error,
      },
    ])
  ),
  golden_sweep_status: {
    contract_rows: rows.length,
    rows_with_golden_sweep_gaps: rowsWithGoldenSweepGaps.map(row => row.row),
    golden_sweep_complete: rowsWithGoldenSweepGaps.length === 0,
  },
  non_golden_triage: {
    rows_ready_for_non_golden_triage: rowsReadyForNonGoldenTriage.length,
    remaining_blocked_rows: remainingBlockedRows.map(row => row.row),
    remaining_blocker_counts: nonGoldenBlockerCounts,
    next_recommended_row: remainingBlockedRows.length > 0 ? remainingBlockedRows[0].row : null,
  },
  rows: rowsReadyForNonGoldenTriage,
};

console.log(JSON.stringify(report, null, 2));

const allAuditsOk = Object.values(auditResults).every(result => result.ok === true);
if (!allAuditsOk || rowsWithGoldenSweepGaps.length > 0 || remainingBlockedRows.length > 0) {
  process.exitCode = 1;
}
