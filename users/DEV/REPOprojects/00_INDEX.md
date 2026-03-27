# DEV REPOprojects index

[DEV_REPOPROJECTS_ROOT]

purpose: organize DEV workstreams under `users/DEV/REPOprojects/` so they are easy to navigate and do not drift from canonical repo doctrine.

Rules:
- This area is **DEV working space**, not engine canon.
m When anything here conflicts with `/engine/*` or `/main/*`, repo canon wins.
- Each project folder must have its own `00_INDEX.md` and (if needed) a scope-lock file.

## Projects
- `GUIGUX/` — Workbench v3 GU/W lane (human-first projection of solver/engine structure).

## Conventions
- `00_INDEX.md` in each folder = navigation + file roles
- `10_SCOPE_LOCK_*.md` = locked understanding that other notes defer to
- `20_WORKING_BOARD_*.md` or existing working boards = active planning/task notes
- `_confirmed_findings_*.md` = stable findings; do not edit lightly; append with dates if needed

Last updated: 2026-03-27
