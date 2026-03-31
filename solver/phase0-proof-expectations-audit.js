import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturesDir = path.join(root, 'solver', 'fixtures', 'phase0');
const CANONICAL_PUBLIC_ENTRYPOINT = 'solver/index.js#solveCase';
const CANONICAL_RUNTIME_MODE = 'canon-locked-runtime';
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
    suites.sort((left, right) =>
      String(left.suite_id || '').localeCompare(String(right.suite_id || ''))
    );
  }
  return rowMap;
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

function buildCoverageRowsManifest(manifests = []) {
  return manifests.find(manifest => manifest.file === 'coverage_rows.json') || null;
}

function evaluateRowProofExpectationDeclaration(row = {}, fixtureIdMap = new Map(), rowLocalSuiteMap = new Map()) {
  const explicit = normalizeExplicitProofExpectations(row);
  const declaredFixtureIds = Array.isArray(row.fixture_ids) ? row.fixture_ids.slice().sort() : [];
  const requiredFixtureClasses = Array.isArray(row.required_fixture_classes)
    ? row.required_fixture_classes.slice().sort()
    : [];
  const rowFixtures = declaredFixtureIds
    .map(fixtureId => fixtureIdMap.get(fixtureId))
    .filter(Boolean);
  const rowLocalSuites = rowLocalSuiteMap.get(row.row || '(unmapped-row)') || [];

  const missingRequiredKeys = explicit
    ? REQUIRED_PROOF_EXPECTATION_KEYS.filter(key => !(key in (row.proof_expectations || {})))
    : REQUIRED_PROOF_EXPECTATION_KEYS.slice();

  const integrationFixtureIds = explicit?.integration_fixture_ids || [];
  const missingIntegrationFixtureIds = integrationFixtureIds
    .filter(fixtureId => !fixtureIdMap.has(fixtureId))
    .sort();
  const undeclaredIntegrationFixtureIds = integrationFixtureIds
    .filter(fixtureId => !declaredFixtureIds.includes(fixtureId))
    .sort();
  const nonIntegrationFixtureIds = integrationFixtureIds
    .filter(fixtureId => fixtureIdMap.has(fixtureId))
    .filter(fixtureId => fixtureIdMap.get(fixtureId)?.fixture_class !== 'integration')
    .sort();

  const expectedExplicit = (row.target_state || '') === 'full';
  const explicitExists = !!explicit;
  const canonicalEntrypointPass = !explicit
    ? false
    : explicit.public_entrypoint === CANONICAL_PUBLIC_ENTRYPOINT;
  const canonicalRuntimeModePass = !explicit
    ? false
    : explicit.runtime_mode === CANONICAL_RUNTIME_MODE;
  const suiteRequirementPass = !explicit
    ? rowLocalSuites.length > 0
    : !explicit.row_local_suite_required || rowLocalSuites.length > 0;
  const integrationRequirementPass = !explicit
    ? false
    : (
        (!explicit.output_contract_surface_required || integrationFixtureIds.length > 0) &&
        missingIntegrationFixtureIds.length === 0 &&
        undeclaredIntegrationFixtureIds.length === 0 &&
        nonIntegrationFixtureIds.length === 0
      );
  const explicitDeclarationPass = expectedExplicit
    ? (
        explicitExists &&
        missingRequiredKeys.length === 0 &&
        canonicalEntrypointPass &&
        canonicalRuntimeModePass &&
        suiteRequirementPass &&
        integrationRequirementPass
      )
    : true;

  return {
    row: row.row || '(unmapped-row)',
    target_state: row.target_state || 'full',
    explicit_required: expectedExplicit,
    explicit_exists: explicitExists,
    declaration_mode: explicit?.mode || null,
    required_fixture_classes: requiredFixtureClasses,
    declared_fixture_ids: declaredFixtureIds,
    declared_fixture_count: declaredFixtureIds.length,
    declared_fixture_classes_observed: Array.from(
      new Set(rowFixtures.map(fixture => fixture.fixture_class).filter(Boolean))
    ).sort(),
    row_local_suite_ids: rowLocalSuites.map(suite => suite.suite_id),
    row_local_suite_count: rowLocalSuites.length,
    missing_required_keys: missingRequiredKeys,
    expected_public_entrypoint: explicit?.public_entrypoint || null,
    expected_runtime_mode: explicit?.runtime_mode || null,
    integration_fixture_ids: integrationFixtureIds,
    missing_integration_fixture_ids: missingIntegrationFixtureIds,
    undeclared_integration_fixture_ids: undeclaredIntegrationFixtureIds,
    non_integration_fixture_ids: nonIntegrationFixtureIds,
    canonical_entrypoint_pass: canonicalEntrypointPass,
    canonical_runtime_mode_pass: canonicalRuntimeModePass,
    suite_requirement_pass: suiteRequirementPass,
    integration_requirement_pass: integrationRequirementPass,
    explicit_declaration_pass: explicitDeclarationPass,
  };
}

function summarizeProofExpectationChecks(checks = []) {
  const explicitRows = checks.filter(check => check.explicit_exists);
  const failingRows = checks.filter(check => !check.explicit_declaration_pass);
  return {
    total_rows: checks.length,
    explicit_required_rows: checks.filter(check => check.explicit_required).length,
    explicit_present_rows: explicitRows.length,
    explicit_missing_rows: checks.filter(check => check.explicit_required && !check.explicit_exists).map(check => check.row).sort(),
    passing_rows: checks.filter(check => check.explicit_declaration_pass).length,
    failing_rows: failingRows.length,
    failing_row_ids: failingRows.map(check => check.row).sort(),
    rows_with_missing_required_keys: checks
      .filter(check => check.missing_required_keys.length > 0)
      .map(check => check.row)
      .sort(),
    rows_with_bad_integration_fixture_ids: checks
      .filter(check =>
        check.missing_integration_fixture_ids.length > 0 ||
        check.undeclared_integration_fixture_ids.length > 0 ||
        check.non_integration_fixture_ids.length > 0
      )
      .map(check => check.row)
      .sort(),
    rows_with_bad_public_entrypoint_declaration: checks
      .filter(check => check.explicit_exists && !check.canonical_entrypoint_pass)
      .map(check => check.row)
      .sort(),
    rows_with_bad_runtime_mode_declaration: checks
      .filter(check => check.explicit_exists && !check.canonical_runtime_mode_pass)
      .map(check => check.row)
      .sort(),
    rows_missing_required_row_local_suites: checks
      .filter(check => check.explicit_required && !check.suite_requirement_pass)
      .map(check => check.row)
      .sort(),
  };
}

const coverageRowsManifest = buildCoverageRowsManifest(manifests);
if (!coverageRowsManifest) {
  throw new Error('coverage_rows.json manifest is required for proof-expectations audit');
}

const fixtureRecords = buildFixtureRecords(manifests);
const fixtureIdMap = new Map(fixtureRecords.map(record => [record.id, record]));
const rowLocalSuiteMap = buildRowLocalSuiteMap(manifests);
const rowDeclarations = Array.isArray(coverageRowsManifest.data.rows)
  ? coverageRowsManifest.data.rows
  : [];

const report = {
  canonical_public_entrypoint: CANONICAL_PUBLIC_ENTRYPOINT,
  canonical_runtime_mode: CANONICAL_RUNTIME_MODE,
  required_proof_expectation_keys: REQUIRED_PROOF_EXPECTATION_KEYS,
  rows: rowDeclarations.map(row =>
    evaluateRowProofExpectationDeclaration(row, fixtureIdMap, rowLocalSuiteMap)
  ),
};
report.summary = summarizeProofExpectationChecks(report.rows);

console.log(JSON.stringify(report, null, 2));

if (report.summary.failing_rows > 0) {
  process.exitCode = 1;
}
