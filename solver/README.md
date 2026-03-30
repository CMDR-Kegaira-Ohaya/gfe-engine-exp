# Solver Layer

This directory is reserved for executable implementation of the GFE runtime.

## Purpose
`/solver/` is where executable math, validation, normalization, payload transforms, and dashboard-shaping code should live.

## Authority
- `/engine/*` defines canon.
- `/solver/*` implements canon.
- `/solver/*` must not revise doctrine.

## Governance
- No automatic process may modify `/solver/`.
- The assistant may inspect, analyze, compare, and test solver logic, but repository changes require explicit human approval.
- Findings should be reported in chat first.

## Current validation surfaces
- `selftest.js` — compact smoke check for the current runtime
- `phase0-audit.js` — Phase 0 audit runner for the v15.7 solver-coverage program
- `fixtures/phase0/` — named Phase 0 proof-base scaffold cases and manifest

## Intended future contents
- validator
- normalizer
- payload
- envelope
- dashboard
- tests

## Hard boundary
If a change affects model truth, it belongs in `/engine/`.
If a change affects executable implementation, it belongs in `/solver/`.
