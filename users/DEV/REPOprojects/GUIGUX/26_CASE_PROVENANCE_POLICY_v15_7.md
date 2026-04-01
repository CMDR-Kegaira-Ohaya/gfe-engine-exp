# Case provenance policy — v15.7

[GUIGUX_CASE_PROVENANCE_POLICY_V15_7]

Links back to:
- `[CONTROL_SURFACE_SOLVER_AUTHORITY]`
- `[BRIEF_SOLVER_AWARE_EXECUTION]`
- `[GUI_ARTIFACT_DISPLAY_STATE]`
- `[GUIGUX_SOLVER_COVERAGE_PROGRAM_V15_7]`

---

## 1) Purpose

This note closes a specific ambiguity:

An encoding may exist in a case package without being a solver-produced truth artifact.

The repo must therefore distinguish:
- artifact presence
- solver compatibility
- solver certification

This policy allows demo/smoke/fixture cases while preventing them from being silently treated as solver-produced outputs.

---

## 2) Provenance classes

Use one of these classes when the status is known:

- `demo/smoke`
- `fixture`
- `hypothetical/pre-solver`
- `solver-compatible`
- `solver-certified`
- `unknown/unspecified`

Meaning:

### `demo/smoke`
Built to test packaging, UI, navigation, or end-to-end flow.
May contain hand-authored structure.
Must not be treated as solver proof.

### `fixture`
Built to support testing, regression harnesses, or controlled product behavior.
May be synthetic or partially synthetic.
Must not be treated as solver proof unless separately certified.

### `hypothetical/pre-solver`
Case material exists, but solved structure does not yet have solver provenance.

### `solver-compatible`
Structure uses solver / engine vocabulary and may be shaped for later solver-facing work, but the package is not yet solver-certified.

### `solver-certified`
The current structure is tied to an explicit solver provenance chain.

### `unknown/unspecified`
The current package does not declare provenance clearly enough to classify more strongly.

---

## 3) Minimum chain for `solver-certified`

A case may be called `solver-certified` only when all of the following are present and explicit:

1. raw case source
2. explicit preparation / solve-input artifact
3. explicit solver run or recorded solve reference
4. saved solver output artifact
5. interpretation / GUI projection that points back to that solver output

If any link is missing, ambiguous, manual, or only implied, do not use `solver-certified`.

---

## 4) Rules

- GPT may create `demo/smoke`, `fixture`, `hypothetical/pre-solver`, or `solver-compatible` case material when explicitly useful.
- GPT must not present hand-authored or manually assembled structure as `solver-certified`.
- GUI presence of an encoding does not imply solver certification.
- Repo presence of an encoding does not imply solver certification.
- Narrative/readings may interpret solved structure, but may not replace solver provenance.
- Unknown provenance must stay unknown rather than being upgraded by convenience.

---

## 5) Manifest expectation

Case manifests should declare provenance when known.

Suggested block:

```json
"provenance": {
  "class": "solver-compatible",
  "solver_certified": false,
  "solve_output_path": null,
  "solve_run_ref": null,
  "note": "Hand-authored demo encoding for product/UI testing. Not a solver-certified case output."
}
```

Fields:
- `class`
- `solver_certified`
- `solve_output_path`
- `solve_run_ref`
- `note`

---

## 6) GUI expectation

When known, the GUI should show:
- provenance class
- whether a solve artifact is present
- whether the current structure is solver-certified, provisional, or absent

The GUI must not imply certification merely because encoding is present.

---

## 7) Immediate practical use

This policy does **not** block:
- demo cases
- smoke cases
- fixtures
- exploratory encodings

It only blocks category confusion.

The repo may move fast, but it must label what kind of truth claim each case is actually making.

Last updated: 2026-04-01
