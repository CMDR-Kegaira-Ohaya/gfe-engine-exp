import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

const AUDITS = [
  {
    id: 'phase0_audit',
    path: path.join(root, 'solver', 'phase0-audit-normalized.js'),
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
  const stderr = result.stderr || '';
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
    stdout_preview: stdout ? stdout.slice(0, 400) : '',
    stderr_preview: stderr ? stderr.slice(0, 400) : '',
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
        promotion_state: null,
        current_state: null,
        target_state: null,
      },
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
    pushUnique(entry.surfaces.contract, row.blockers || []);
  }
}

function scoreRow(entry = {}) {
  const promotion = entry.surfaces?.promotion || [];
  const declaration = entry.surfaces?.declaration || [];
  const contract = entry.surfaces?.contract || [];

  let score = 0;
  score += promotion.length * 5;
  score += declaration.length * 3;
  score += contract.length * 4;

  if (promotion.includes('invariant_pass')) score += 4;
  if (promotion.includes('behavioral_contrast_proof')) score += 3;
  if (promotion.includes('exposed_output_contract')) score += 3;
  if (promotion.includes('declared_row_proof_alignment')) score += 2;
  if (contract.includes('missing_declared_fixture_classes')) score += 3;
  if (contract.includes('missing_row_local_suite')) score += 3;
  if (declaration.includes('missing_explicit_proof_expectations')) score += 2;

  return score;
}

function buildQueue(rowMap = new Map()) {
  const rows = Array.from(rowMap.values()).map(entry => {
    const promotion = entry.surfaces.promotion || [];
    const declaration = entry.surfaces.declaration || [];
    const contract = entry.surfaces.contract || [];
    const uniqueBlockers = Array.from(new Set([...promotion, ...declaration, ...contract])).sort();
    const priorityScore = scoreRow(entry);
    const quickWin =
      promotion.length <= 1 &&
      declaration.length <= 1 &&
      contract.length <= 1 &&
      uniqueBlockers.length > 0;

    return {
      row: entry.row,
      priority_score: priorityScore,
      total_blockers: uniqueBlockers.length,
      surfaces: {
        promotion,
        declaration,
        contract,
      },
      unique_blockers: uniqueBlockers,
      quick_win: quickWin,
      metadata: entry.metadata,
    };
  });

  rows.sort((left, right) => {
    if (right.priority_score !== left.priority_score) {
      return right.priority_score - left.priority_score;
    }
    if (right.total_blockers !== left.total_blockers) {
      return right.total_blockers - left.total_blockers;
    }
    return String(left.row).localeCompare(String(right.row));
  });

  return rows;
}

const auditResults = Object.fromEntries(
  AUDITS.map(audit => {
    const result = runAudit(audit);
    return [audit.id, result];
  })
);

const normalizedAuditStatus = Object.fromEntries(
  Object.entries(auditResults).map(([id, result]) => [
    id,
    {
      raw_ok: result.ok === true,
      effective_ok: result.ok === true,
      exit_code: result.exit_code,
      signal: result.signal,
      invocation_error: result.invocation_error,
      parse_error: result.parse_error,
      stdout_preview: result.stdout_preview,
      stderr_preview: result.stderr_preview,
      normalized_audit_wrapper: id === 'phase0_audit',
    },
  ])
);

const rowMap = new Map();
if (auditResults.phase0_audit?.report) addPromotionSurface(rowMap, auditResults.phase0_audit.report);
if (auditResults.phase0_proof_expectations_audit?.report) addDeclarationSurface(rowMap, auditResults.phase0_proof_expectations_audit.report);
if (auditResults.phase0_contract_preflight?.report) addContractSurface(rowMap, auditResults.phase0_contract_preflight.report);

const row_queue = buildQueue(rowMap);
const blocked_rows = row_queue.filter(row => row.total_blockers > 0);
const quick_win_rows = blocked_rows.filter(row => row.quick_win).map(row => row.row);
const next_recommended_row = blocked_rows.length > 0 ? blocked_rows[0].row : null;

const global_blockers = {
  failing_seed_check_ids:
    auditResults.phase0_audit?.report?.cross_phase_invariant_check_summary?.failed_seed_check_ids || [],
  failing_row_local_suite_ids:
    auditResults.phase0_audit?.report?.row_local_suite_check_summary?.failing_suite_ids || [],
  failing_requirement_ids:
    auditResults.phase0_contract_preflight?.report?.modern_validation_corpus_summary?.failing_requirement_ids || [],
};

const report = {
  audits: normalizedAuditStatus,
  audit_normalization: auditResults.phase0_audit?.report?.audit_normalization || {
    wrapper: 'solver/phase0-audit-normalized.js',
    normalized_from_known_seed_drift: false,
  },
  row_queue,
  summary: {
    total_rows: row_queue.length,
    blocked_rows: blocked_rows.length,
    quick_win_rows,
    next_recommended_row,
    fully_clear_rows: row_queue.filter(row => row.total_blockers === 0).map(row => row.row),
  },
  global_blockers,
};

console.log(JSON.stringify(report, null, 2));

const allEffectiveAuditsOk = Object.values(normalizedAuditStatus).every(result => result.effective_ok === true);
if (!allEffectiveAuditsOk || blocked_rows.length > 0) {
  process.exitCode = 1;
}
