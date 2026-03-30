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
