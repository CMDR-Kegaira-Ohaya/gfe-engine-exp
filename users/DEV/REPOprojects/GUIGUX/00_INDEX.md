# GUIGUX index

[GUIGUX_ROOT]

This folder is the DEV working space for Workbench v3 GUI/UX.

## Read this first
1) `10_SCOPE_LOCK_PIPELINE.md` — the locked system model: engine ↔ solver ↔ GPT stack ↔ GUI projection.
2) `gui_blueprint_and_implementation.md` — working board + implementation map (may contain older notes; scope lock wins on conflict).

## Files and roles
- `10_SCOPE_LOCK_PIPELINE.md`  
  [GUIGUX_SCOPE_LOCK_ROOT]  
  Locked scope/vision + pipeline contract. Use this as the authoritative DEV summary.

- `gui_blueprint_and_implementation.md`  
  [GUIGUX_WORKING_BOARD_ROOT]  
  Active working board, current tasks, implementation pointers. Defer to scope lock.

- `gui_confirmed_findings_2026-03-26.md`  
  [GUIGUX_CONFIRMED_FINDINGS_ROOT]  
  Confirmed findings (UI overload + smoke-fixture constraints). Append rather than rewrite.

- `GFE_VisualCodex.md`  
  [GUIGUX_VISUAL_CODEX_ROOT]  
  Visual doctrine (palette + atlas/projection design rules). Must stay consistent with scope lock.

## Current lane
User-visible polish and projection correctness:
- GUI must project **solver/engine structure as primary**
- readings/briefs are overlays, not replacements

Last updated: 2026-03-27
