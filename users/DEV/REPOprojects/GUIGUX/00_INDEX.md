# GUIGUX index

[GUIGUX_ROOT]

This folder is the DEV working space for Workbench v3 GUI/UX.

## Read this first
1) `10_SCOPE_LOCK_PIPELINE.md` — locked system model + pipeline contract (engine → solver → GPT stack → GUI projection).
2) `20_WORKING_BOARD.md` — active work order for the current lane (must conform to the scope lock).

## Files and roles
- `10_SCOPE_LOCK_PIPELINE.md`  
  [GUIGUX_SCOPE_LOCK_ROOT]  
  Locked scope/vision + pipeline contract. Use this as authoritative DEV scope.

- `20_WORKING_BOARD.md`
  [GUIGUX_WORKING_BOARD_ROOT]
  Active working board and next tasks. Defer to scope lock.

- `gui_confirmed_findings_2026-03-26.md`
  [GUIGUX_CONFIRMED_FINDINGS_ROOT]
  Confirmed findings (UI overload + smoke-fixture constraints). Append rather than rewrite.

- `GFE_VisualCodex.md`
  [GUIGUX_VISUAL_CODEX_ROOT]
  Visual doctrine (palette + atlas/projection design rules). Must stay consistent with scope lock.

Archive note:
 - the older `gui_blueprint_and_implementation.md` working board was consolidated into the scope lock and `20_WORKING_BOARD.md`, then removed to reduce drift. Git history retains it if needed.

## Current lane
User-visible polish and projection correctness:
- GUI must project **solver/engine structure as primary**
- readings/briefs are overlays, not replacements

Last updated: 2026-03-27
