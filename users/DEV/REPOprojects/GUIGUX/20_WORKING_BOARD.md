# GUIGUX working board

[GUIGUX_WORKING_BOARD_ROOT]

Purpose: keep the DEV GUI/UX lane aligned, implementable, and drift-resistant.

If anything in this file conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins.

Last updated: 2026-04-01

---

## Lane posture (locked)

- Current lane: **user-visible product closure + projection correctness**
- Solver authority on structure remains **absolute** (GUI is projection).
- No architecture churn: stay UI-surface and workflow-level unless the repo map explicitly requires deeper changes.
- Solver coverage and the Phase 0 proof base are now treated as **closed inputs on current main**, not as the active work lane.
- Do not reopen solver-rescue work unless a concrete repo-visible contradiction appears.

See: `10_SCOPE_LOCK_PIPELINE.md` → [GUIGUX_PIPELINE_CONTRACT] and [GUIGUX_GUI_PROJECTION_CONTRACT]

---

## North star UX (locked)

### One viewport, stable orientation, whole before commentary

The user should be able to:
1) open the studied case as a whole transformed map
2) keep orientation while changing reading mode
3) inspect a target without losing the whole
4) keep source and narrative as companion surfaces, not replacements for the map

The user should always know:
- where they are
- what is selected
- what actions apply
- which surface is primary

### Stable documents contract (do not break)

Documents remain stable and do **not** hijack the main view:
- Full case (source)
- Full result (synthesized reading)

Map clicks feed focus/inspection behavior, not document replacement.

---

## Interaction contracts (keep)

### Inspect vs Pin (two states)

- Inspect: temporary local focus
- Pin: retained target focus until cleared

### Layers (reduce clutter without changing truth)

Viewport shows only enabled layers:
- nodes / entities
- encounters / links
- payload-bearing structures when appropriate
- optional source/evidence overlays

### Trace mode

Explicit mode that follows continuity/pathing without replacing the main map.

---

## Current implementation plan

### Phase 0 — foundation / solver closure (done)

- solver coverage board now reports full on the current v15.7 contract
- Phase 0 blocker/audit rescue is no longer the active lane
- repo-aware bridge and verified write path exist
- treat this as settled input unless a concrete contradiction appears

### Phase 1 — public product closure (active now)

Goal: make the public product surface clearly and credibly present solved structure.

Minimum outcomes:
- confirm the canonical public/live entry surface
- run a real browser-level closure pass on that surface
- make the whole solved map visibly primary
- keep documents stable and secondary
- make inspect / pin / trace behavior feel clear
- keep repo mutation surfaces useful but secondary to the product center

### Phase 2 — expansion after public closure

Only after the public product surface is clearly good:
- refine evidence-lens behavior
- add filters only as clutter control
- strengthen source → structure → narrative correspondence hints
- expand richer edit / mutation flows only if they do not displace the viewing-first product

---

## Working rules for the current lane

- Do not spend the lane on more solver theory unless repo truth forces it.
- Do not let repo-control success masquerade as product completion.
- Do not let documents become the main screen.
- Do not let the repo panel become the center of gravity.
- Prefer changes that improve immediate user comprehension of solved structure.

---

## Reference notes (keep)

- `gui_confirmed_findings_2026-03-26.md` — confirmed UI overload + smoketest fixture needs
- `GFE_VisualCodex.md` — palette + projection rules
- `21_REBUILD_PLAN.md` — current rebuild plan
- `22_PRODUCT_OPERATING_MAP.md` — whole-product operating map

Last updated: 2026-04-01
