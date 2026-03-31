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
    path: path.relative(root, audit.path || ''),
    exit_code: typeof result.status === 'number' ? result.status : null,
    signal: result.signal || null,
    ok:
      result.error == null &&
      result.signal == null &&
      result.status === 0 &&
      parse_error == null &&
      parsed != null,
    invocation_error: result.error ? String(result.error.message || result.error) : null,
    parse_error,
    stdout_bytes: Buffer.byteLength(stdout, 'utf8'),
    stderr_bytes: Buffer.byteLength(stderr, 'utf8'),
    stdout_preview: stdout ? stdout.slice(0, 400) : '',
    stderr_preview: stderr ? stderr.slice(0, 400) : '',
    report: parsed,
  };
}

function addCounts(target = {}, source = {}) {
  for (const [key, value] of Object.entries(source || {})) {
    if (typeof value !== 'number') continue;
    target[key] = (target[key] || 0) + value;
  }
  return target;
}

function collectSortedUnique(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function summarizePhase0Audit(audit = {}) {
  const report = audit.report || {};
  return {
    id: audit.id,
    ok: audit.ok,
    exit_code: audit.exit_code,
    cross_phase_pass:
      (report.cross_phase_invariant_check_summary?.failed_checks || 0) === 0,
    row_local_suite_pass:
      (report.row_local_suite_check_summary?.failed_checks || 0) === 0,
    full_contract_eligible_rows:
      report.promotion_gate_summary?.full_contract_eligible_rows || 0,
    not_yet_eligible_rows:
      report.promotion_gate_summary?.not_yet_eligible_rows || 0,
    rows_with_explicit_proof_expectations:
      report.coverage_summary?.rows_with_explicit_proof_expectations || 0,
    failing_seed_check_ids:
      report.cross_phase_invariant_check_summary?.failed_seed_check_ids || [],
    failing_row_local_suite_ids:
      report.row_local_suite_check_summary?.failing_suite_ids || [],
    promotion_blocker_counts:
      report.promotion_gate_summary?.blocker_counts || {},
    promotion_blocked_rows:
      collectSortedUnique(
        (report.coverage_rows || [])
          .filter(row => !row.full_contract_eligible)
          .map(row => row.row)
      ),
  };
}

function summarizeProofExpectationsAudit(audit = {}) {
  const report = audit.report || {};
  const summary = report.summary || {};
  return {
    id: audit.id,
    ok: audit.ok,
    exit_code: audit.exit_code,
    passing_rows: summary.passing_rows || 0,
    failing_rows: summary.failing_rows || 0,
    explicit_missing_rows: summary.explicit_missing_rows || [],
    rows_with_missing_required_keys: summary.rows_with_missing_required_keys || [],
    rows_with_bad_integration_fixture_ids: summary.rows_with_bad_integration_fixture_ids || [],
    rows_with_bad_public_entrypoint_declaration:
      summary.rows_with_bad_public_entrypoint_declaration || [],
    rows_with_bad_runtime_mode_declaration:
      summary.rows_with_bad_runtime_mode_declaration || [],
    rows_missing_required_row_local_suites:
      summary.rows_missing_required_row_local_suites || [],
  };
}

function summarizeContractPreflight(audit = {}) {
  const report = audit.report || {};
  return {
    id: audit.id,
    ok: audit.ok,
    exit_code: audit.exit_code,
    contract_rows_declared:
      report.final_validation_preflight?.contract_rows_declared || false,
    contract_rows_declaration_ready:
      report.final_validation_preflight?.contract_rows_declaration_ready || false,
    modern_validation_corpus_declared:
      report.final_validation_preflight?.modern_validation_corpus_declared || false,
    final_validation_preflight_pass:
      report.final_validation_preflight?.pass || false,
    failing_rows:
      report.contract_row_summary?.failing_rows || [],
    blocker_counts:
      report.contract_row_summary?.blocker_counts || {},
    failing_requirement_ids:
      report.modern_validation_corpus_summary?.failing_requirement_ids || [],
    undeclared_coverage_rows:
      report.undeclared_coverage_rows || [],
  };
}

function buildBlockerSummary(auditSummaries = {}) {
  const phase0Audit = auditSummaries.phase0_audit || {};
  const proofAudit = auditSummaries.phase0_proof_expectations_audit || {};
  const contractPreflight = auditSummaries.phase0_contract_preflight || {};

  const blocker_counts = {};
  addCounts(blocker_counts, phase0Audit.promotion_blocker_counts || {});
  addCounts(blocker_counts, contractPreflight.blocker_counts || {});

  if ((phase0Audit.failing_seed_check_ids || []).length > 0) {
    blocker_counts.cross_phase_seed_failures = (phase0Audit.failing_seed_check_ids || []).length;
  }
  if ((phase0Audit.failing_row_local_suite_ids || []).length > 0) {
    blocker_counts.row_local_suite_failures = (phase0Audit.failing_row_local_suite_ids || []).length;
  }
  if ((proofAudit.explicit_missing_rows || []).length > 0) {
    blocker_counts.missing_explicit_proof_expectations = (proofAudit.explicit_missing_rows || []).length;
  }
  if ((proofAudit.rows_with_missing_required_keys || []).length > 0) {
    blocker_counts.incomplete_proof_expectation_shape = (proofAudit.rows_with_missing_required_keys || []).length;
  }
  if ((proofAudit.rows_with_bad_integration_fixture_ids || []).length > 0) {
    blocker_counts.bad_integration_fixture_ids = (proofAudit.rows_with_bad_integration_fixture_ids || []).length;
  }
  if ((contractPreflight.failing_requirement_ids || []).length > 0) {
    blocker_counts.modern_validation_corpus_preflight_failures = (contractPreflight.failing_requirement_ids || []).length;
  }

  return {
    blocker_counts,
    promotion_blocked_rows:
      phase0Audit.promotion_blocked_rows || [],
    declaration_blocked_rows: collectSortedUnique([
      ...(proofAudit.explicit_missing_rows || []),
      ...(proofAudit.rows_with_missing_required_keys || []),
      ...(proofAudit.rows_with_bad_integration_fixture_ids || []),
      ...(proofAudit.rows_with_bad_public_entrypoint_declaration || []),
      ...(proofAudit.rows_with_bad_runtime_mode_declaration || []),
      ...(proofAudit.rows_missing_required_row_local_suites || []),
    ]),
    contract_preflight_blocked_rows:
      contractPreflight.failing_rows || [],
    failing_seed_check_ids:
      phase0Audit.failing_seed_check_ids || [],
    failing_row_local_suite_ids:
      phase0Audit.failing_row_local_suite_ids || [],
    failing_requirement_ids:
      contractPreflight.failing_requirement_ids || [],
  };
}

const auditResults = Object.fromEntries(
  AUDITS.map(audit => {
    const result = runAudit(audit);
    return [audit.id, result];
  })
);

const auditSummaries = {
  phase0_audit: summarizePhase0Audit(auditResults.phase0_audit),
  phase0_proof_expectations_audit: summarizeProofExpectationsAudit(
    auditResults.phase0_proof_expectations_audit
  ),
  phase0_contract_preflight: summarizeContractPreflight(
    auditResults.phase0_contract_preflight
  ),
};

const blocker_summary = buildBlockerSummary(auditSummaries);
const all_audits_ok = Object.values(auditResults).every(result => result.ok === true);
const phase0_readiness = {
  all_audits_ok,
  implementation_surface_ready:
    auditSummaries.phase0_audit.cross_phase_pass === true &&
    auditSummaries.phase0_audit.row_local_suite_pass === true,
  declaration_surface_ready:
    (auditSummaries.phase0_proof_expectations_audit.failing_rows || 0) === 0,
  contract_surface_ready:
    auditSummaries.phase0_contract_preflight.final_validation_preflight_pass === true,
  full_contract_rows_ready:
    (auditSummaries.phase0_audit.not_yet_eligible_rows || 0) === 0,
  final_validation_preflight_pass:
    auditSummaries.phase0_contract_preflight.final_validation_preflight_pass === true,
  state:
    all_audits_ok &&
    (auditSummaries.phase0_audit.not_yet_eligible_rows || 0) === 0 &&
    auditSummaries.phase0_contract_preflight.final_validation_preflight_pass === true
      ? 'phase0-ready'
      : 'blocked',
};

const report = {
  audits: Object.fromEntries(
    Object.entries(auditResults).map(([id, result]) => [
      id,
      {
        id,
        path: result.path,
        ok: result.ok,
        exit_code: result.exit_code,
        signal: result.signal,
        invocation_error: result.invocation_error,
        parse_error: result.parse_error,
        stdout_bytes: result.stdout_bytes,
        stderr_bytes: result.stderr_bytes,
      },
    ])
  ),
  audit_summaries: auditSummaries,
  blocker_summary,
  phase0_readiness,
};

console.log(JSON.stringify(report, null, 2));

if (!phase0_readiness.all_audits_ok || phase0_readiness.state !== 'phase0-ready') {
  process.exitCode = 1;
}
