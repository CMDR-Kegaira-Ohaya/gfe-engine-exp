# Phase 0 solver fixtures — v15.7

This directory contains the Phase 0 proof-base scaffold for solver modernization.

Purpose:
- give every named Phase 0 fixture a stable id
- provide runnable input cases through the public solver path
- support audit-style comparison before rows are upgraded to hard-gated `full`

Boundary:
- this is not yet the polished final validation corpus
- fixture names and purposes are contract-facing
- contrast pairs are allowed to *fail to differ* at first; that is useful audit information during phased work

Primary entrypoints:
- `solver/phase0-audit.js`
- `solver/fixtures/phase0/manifest.json`
- `solver/fixtures/phase0/failure_split.json`
- `solver/fixtures/phase0/failure_projection.json`
- `solver/fixtures/phase0/relation_split.json`
- `solver/fixtures/phase0/threshold_split.json`
- `solver/fixtures/phase0/family_truth.json`
- `solver/fixtures/phase0/face_split.json`
- `solver/fixtures/phase0/order_split.json`
- `solver/fixtures/phase0/leg_distributed.json`
- `solver/fixtures/phase0/field_recursion.json`

Audit loading rule:
- the Phase 0 audit now loads **all** `.json` fixture packs in this directory
- `manifest.json` remains the base scaffold pack
- focused packs such as `failure_split.json`, `failure_projection.json`, `relation_split.json`, `threshold_split.json`, `family_truth.json`, `face_split.json`, `order_split.json`, `leg_distributed.json`, and `field_recursion.json` are supplemental, not competing authority surfaces

Divergence-invariant rule:
- contrast fixtures may declare `divergence_invariants`
- each invariant carries:
  - `label`
  - `class`
  - `expectation` (`all_must_differ` or `some_must_differ`)
  - `paths`
- the audit reports invariant pass/fail by class so contrasts are tagged, not merely shown
- invariants are informative by default
- selected fixtures may now set `enforce_invariants: true`
- when enabled, failed divergence invariants become an audit hard failure for that fixture
