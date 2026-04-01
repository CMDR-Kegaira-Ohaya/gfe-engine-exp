import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');
const CANONICAL_PUBLIC_ENTRYPOINT = 'solver/index.js#solveCase';
const CANONICAL_RUNTIME_MODE = 'canon-locked-runtime';
const CONTRACT_ROWS = [
  'AXIS_LOCAL_CORE',
  'RELATION_TRIAD',
  'THRESHOLD_PREVALENCE',
  'FAMILY_TRUTH',
  'FAILURE_OVERFLOW',
  'FAILURE_SUBSTITUTION',
  'FAILURE_PLASTIC_DEFORMATION',
  'FAILURE_SUPPRESSION',
  'FAILURE_COLLAPSE',
  'FACE_DISTINCTION',
  'ORDER_RECURSION',
  'LEG_DISTRIBUTED',
  'FIELD_RECURSION',
];
const REQUIRED_FIXTURE_CLASSES = ['golden', 'contrast', 'anti-collapse', 'integration'];
const REQUIRED_PROOF_EXPECTATION_KEYS = [
  'mode',
  'behavioral_contrast_surface_required',
  'output_contract_surface_required',
  'non_collapse_proof_required',
  'complete_fixture_class_set_required',
  'row_local_suite_required',
  'public_entrypoint',
  'runtime_mode',
  'integration_fixture_ids',
];
const MODERN_VALIDATION_CORPUS_REQUIREMENTS = [
  { id: 'triadic_encounter', rows: ['RELATION_TRIAD'] },
  { id: 'threshold', rows: ['THRESHOLD_PREVALENCE'] },
  { id: 'family_interference', rows: ['FAMILY_TRUTH'] },
  { id: 'failure_overflow', rows: ['FAILURE_OVERFLOW'] },
  { id: 'failure_substitution', rows: ['FAILURE_SUBSTITUTION'] },
  { id: 'failure_plastic_deformation', rows: ['FAILURE_PLASTIC_DEFORMATION'] },
  { id: 'failure_suppression', rows: ['FAILURE_SUPPRESSION'] },
  { id: 'failure_collapse', rows: ['FAILURE_COLLAPSE'] },
  { id: 'face_distinction', rows: ['FACE_DISTINCTION'] },
  { id: 'order_recursion', rows: ['ORDER_RECURSION'] },
  { id: 'distributed_leg', rows: ['LEG_DISTRIBUTED'] },
  { id: 'field_recursion', rows: ['FIELD_RECURSION'] },
];

const manifestPaths = fs
  .readdirSync(fixturesDir)
  .filter(name => name.endsWith('.json'))
  .sort()
  .map(name => path.join(fixturesDir, name));

const manifests = manifestPaths.map(filePath => ({
  file: path.basename(filePath),
  data: JSON.parse(fs.readFileSync(filePath, 'utf8')),
}));

function inferFixtureClass(fixture = {}) {
  if (fixture.fixture_class) return fixture.fixture_class;
  if (fixture.kind === 'single') return 'golden';
  if (fixture.kind === 'contrast') return 'contrast';
  return 'unclassified';
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

function buildFixtureRecords(manifests = []) {
  return manifests.flatMap(manifest =>
    (manifest.data.fixtures || []).map(fixture => ({
      id: fixture.id || '(unknown-fixture)',
      row: fixture.row || '(unmapped-row)',
      file: manifest.file,
      kind: fixture.kind || '(unknown-kind)',
      fixture_class: inferFixtureClass(fixture),
    }))
  );
}

function buildRowLocalSuiteMap(manifests = []) {
  const rowMap = new Map();
  for (const manifest of manifests) {
    for (const suite of manifest.data.row_local_suites || []) {
      const row = suite.row || '(unmapped-row)';
      if (!rowMap.has(row)) rowMap.set(row, []);
      rowMap.get(row).push({
        suite_id: suite.suite_id || '(unnamed-suite)',
        label: suite.label || '',
        file: manifest.file,
      });
    }
  }
  for (const suites of rowMap.values()) {
    suites.sort((left, right) => String(left.suite_id || '').localeCompare(String(right.suite_id || '')));
  }
  return rowMap;
}

function buildCoverageRowsManifest(manifests = []) {
  return manifests.find(manifest => manifest.file === 'coverage_rows.json') || null;
}

function buildCoverageRowMap(rows = []) {
  return new Map(rows.map(row => [row.row || '(unmapped-row)', row]));
}

function evaluateContractRow(rowId, coverageRowMap = new Map(), fixtureIdMap = new Map(), rowLocalSuiteMap = new Map()) {
  const row = coverageRowMap.get(rowId) || null;
  const exists_in_coverage_rows = !!row;
  const explicit = row ? normalizeExplicitProofExpectations(row) : null;
  const declared_fixture_ids = Array.isArray(row?.fixture_ids) ? row.fixture_ids.slice().sort() : [];
  const declared_fixture_records = declared_fixture_ids
    .map(fixtureId => fixtureIdMap.get(fixtureId) || null)
    .filter(Boolean);
  const declared_fixture_classes_present = Array.from(
    new Set(
      declared_fixture_records.flatMap(record => {
        const classes = [];
        if (record.kind === 'contrast') classes.push('contrast');
        if (record.fixture_class) classes.push(record.fixture_class);
        return classes;
      }).filter(Boolean)
    )
  ).sort();
  const missing_fixture_classes = REQUIRED_FIXTURE_CLASSES.filter(
    fixtureClass => !declared_fixture_classes_present.includes(fixtureClass)
  );
  const row_local_suites = rowLocalSuiteMap.get(rowId) || [];
  const missing_required_keys = explicit
    ? REQUIRED_PROOF_EXPECTATION_KEYS.filter(key => !(key in (row.proof_expectations || {})))
    : REQUIRED_PROOF_EXPECTATION_KEYS.slice();
  const integration_fixture_ids = explicit?.integration_fixture_ids || [];
  const missing_integration_fixture_ids = integration_fixture_ids
    .filter(fixtureId => !fixtureIdMap.has(fixtureId))
    .sort();
  const undeclared_integration_fixture_ids = integration_fixture_ids
    .filter(fixtureId => !declared_fixture_ids.includes(fixtureId))
    .sort();
  const non_integration_fixture_ids = integration_fixture_ids
    .filter(fixtureId => fixtureIdMap.has(fixtureId))
    .filter(fixtureId => fixtureIdMap.get(fixtureId)?.fixture_class !== 'integration')
    .sort();
  const canonical_public_entrypoint_pass = !!explicit && explicit.public_entrypoint === CANONICAL_PUBLIC_ENTRYPOINT;
  const canonical_runtime_mode_pass = !!explicit && explicit.runtime_mode === CANONICAL_RUNTIME_MODE;
  const proof_expectations_pass =
    !!explicit &&
    missing_required_keys.length === 0 &&
    canonical_public_entrypoint_pass &&
    canonical_runtime_mode_pass &&
    missing_integration_fixture_ids.length === 0 &&
    undeclared_integration_fixture_ids.length === 0 &&
    non_integration_fixture_ids.length === 0;
  const row_local_suite_pass = row_local_suites.length > 0;
  const declaration_preflight_pass =
    exists_in_coverage_rows &&
    proof_expectations_pass &&
    row_local_suite_pass &&
    missing_fixture_classes.length === 0;

  const blockers = [];
  if (!exists_in_coverage_rows) blockers.push('missing_contract_row_declaration');
  if (exists_in_coverage_rows && !explicit) blockers.push('missing_explicit_proof_expectations');
  if (missing_required_keys.length > 0) blockers.push('incomplete_proof_expectations_shape');
  if (missing_fixture_classes.length > 0) blockers.push('missing_declared_fixture_classes');
  if (!row_local_suite_pass) blockers.push('missing_row_local_suite');
  if (explicit && !canonical_public_entrypoint_pass) blockers.push('noncanonical_public_entrypoint');
  if (explicit && !canonical_runtime_mode_pass) blockers.push('noncanonical_runtime_mode');
  if (missing_integration_fixture_ids.length > 0) blockers.push('missing_integration_fixture_ids');
  if (undeclared_integration_fixture_ids.length > 0) blockers.push('undeclared_integration_fixture_ids');
  if (non_integration_fixture_ids.length > 0) blockers.push('nonintegration_ids_in_integration_list');

  return {
    row: rowId,
    exists_in_coverage_rows,
    target_state: row?.target_state || null,
    current_state: row?.current_state || null,
    proof_expectation_mode: explicit?.mode || null,
    declared_fixture_ids,
    declared_fixture_count: declared_fixture_ids.length,
    declared_fixture_classes_present,
    missing_fixture_classes,
    row_local_suite_ids: row_local_suites.map(suite => suite.suite_id),
    row_local_suite_count: row_local_suites.length,
    missing_required_keys,
    integration_fixture_ids,
    missing_integration_fixture_ids,
    undeclared_integration_fixture_ids,
    non_integration_fixture_ids,
    expected_public_entrypoint: explicit?.public_entrypoint || null,
    expected_runtime_mode: explicit?.runtime_mode || null,
    canonical_public_entrypoint_pass,
    canonical_runtime_mode_pass,
    proof_expectations_pass,
    row_local_suite_pass,
    declaration_preflight_pass,
    blockers: blockers.sort(),
  };
}

function summarizeContractRows(rows = []) {
  const blocker_counts = {};
  for (const row of rows) {
    for (const blocker of row.blockers || []) {
      blocker_counts[blocker] = (blocker_counts[blocker] || 0) + 1;
    }
  }
  return {
    contract_row_count: rows.length,
    rows_present_in_coverage_rows: rows.filter(row => row.exists_in_coverage_rows).length,
    rows_with_explicit_proof_expectations: rows.filter(row => row.proof_expectation_mode).length,
    rows_with_complete_declared_fixture_classes: rows.filter(row => row.missing_fixture_classes.length === 0).length,
    rows_with_row_local_suites: rows.filter(row => row.row_local_suite_pass).length,
    rows_passing_declaration_preflight: rows.filter(row => row.declaration_preflight_pass).length,
    failing_rows: rows.filter(row => !row.declaration_preflight_pass).map(row => row.row).sort(),
    blocker_counts,
  };
}

function evaluateModernValidationCorpus(contractRows = [], rowReports = []) {
  const rowReportMap = new Map(rowReports.map(report => [report.row, report]));
  return MODERN_VALIDATION_CORPUS_REQUIREMENTS.map(requirement => {
    const row_reports = requirement.rows
      .filter(rowId => contractRows.includes(rowId))
      .map(rowId => rowReportMap.get(rowId))
      .filter(Boolean);
    const missing_rows = requirement.rows.filter(rowId => !rowReportMap.has(rowId)).sort();
    const failing_rows = row_reports
      .filter(report => !report.declaration_preflight_pass)
      .map(report => report.row)
      .sort();
    return {
      id: requirement.id,
      rows: requirement.rows,
      missing_rows,
      failing_rows,
      pass: missing_rows.length === 0 && failing_rows.length === 0,
    };
  });
}

function summarizeModernValidationCorpus(corpusChecks = []) {
  return {
    requirement_count: corpusChecks.length,
    passing_requirements: corpusChecks.filter(check => check.pass).length,
    failing_requirements: corpusChecks.filter(check => !check.pass).length,
    failing_requirement_ids: corpusChecks.filter(check => !check.pass).map(check => check.id).sort(),
  };
}

const coverageRowsManifest = buildCoverageRowsManifest(manifests);
if (!coverageRowsManifest) {
  throw new Error('coverage_rows.json manifest is required for contract preflight');
}

const fixtureRecords = buildFixtureRecords(manifests);
const fixtureIdMap = new Map(fixtureRecords.map(record => [record.id, record]));
const rowLocalSuiteMap = buildRowLocalSuiteMap(manifests);
const coverageRows = Array.isArray(coverageRowsManifest.data.rows) ? coverageRowsManifest.data.rows : [];
const coverageRowMap = buildCoverageRowMap(coverageRows);
const undeclaredCoverageRows = coverageRows
  .map(row => row.row)
  .filter(rowId => !CONTRACT_ROWS.includes(rowId))
  .sort();

const contract_row_reports = CONTRACT_ROWS.map(rowId =>
  evaluateContractRow(rowId, coverageRowMap, fixtureIdMap, rowLocalSuiteMap)
);
const contract_row_summary = summarizeContractRows(contract_row_reports);
const modern_validation_corpus = evaluateModernValidationCorpus(CONTRACT_ROWS, contract_row_reports);
const modern_validation_corpus_summary = summarizeModernValidationCorpus(modern_validation_corpus);

const report = {
  canonical_public_entrypoint: CANONICAL_PUBLIC_ENTRYPOINT,
  canonical_runtime_mode: CANONICAL_RUNTIME_MODE,
  contract_rows: CONTRACT_ROWS,
  required_fixture_classes: REQUIRED_FIXTURE_CLASSES,
  required_proof_expectation_keys: REQUIRED_PROOF_EXPECTATION_KEYS,
  undeclared_coverage_rows: undeclaredCoverageRows,
  contract_row_reports,
  contract_row_summary,
  modern_validation_corpus,
  modern_validation_corpus_summary,
  final_validation_preflight: {
    contract_rows_declared: contract_row_summary.rows_present_in_coverage_rows === CONTRACT_ROWS.length,
    contract_rows_declaration_ready: contract_row_summary.rows_passing_declaration_preflight === CONTRACT_ROWS.length,
    modern_validation_corpus_declared: modern_validation_corpus_summary.failing_requirements === 0,
    pass:
      contract_row_summary.rows_present_in_coverage_rows === CONTRACT_ROWS.length &&
      contract_row_summary.rows_passing_declaration_preflight === CONTRACT_ROWS.length &&
      modern_validation_corpus_summary.failing_requirements === 0,
  },
};

console.log(JSON.stringify(report, null, 2));

if (!report.final_validation_preflight.pass) {
  process.exitCode = 1;
}
