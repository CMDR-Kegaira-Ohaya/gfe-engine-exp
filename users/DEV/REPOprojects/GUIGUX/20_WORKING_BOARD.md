# GUIGUX working board

[GUIGUX_WORKING_BOARD_ROOT]

Purpose: keep the DEV GUI/UX lane aligned, implementable, and drift-resistant.

If anything in this file conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins.

Last updated: 2026-03-28

---

## Lane posture (locked)

- Current lane: **user-visible polish + projection correctness**
- Solver authority on structure remains **absolute** (GUI is projection).
- No architecture churn: stay UI-surface and workflow-level unless a repo map explicitly requires deeper changes.

See: `10_SCOPE_LOCK_PIPELINE.md` → [GUIGUX_PIPELINE_CONTRACT] and [GUIGUX_GUI_PROJECTION_CONTRACT]

---

## North star UX (locked)

### One viewport, step-zoom navigation

Replace “100 panels and drawers” with **one primary viewport** the user navigates by **discrete zoom steps**:

1) **Galaxy** (cases as stars)
2) **System** (within-case map / Case Space)
3) **Moment** (timestep neighborhood)
4) **Target** (one node/link focus)
5) **Deep** (encoding + tables, on demand only)

The user always knows:
- where they are (breadcrumb / zoom stack)
- what is selected (focus card)
- what actions apply (pin / trace / layers)

### Stable documents contract (do not break)

Documents panel remains stable and does **not** follow map clicks:
- Full case (source)
- Full result (synthesized)

Map clicks feed **Focus Inspector** (and visual highlights), not documents replacement.

---

## Interaction contracts (copy from Elite-style maps)

### Inspect vs Pin (two states)

- Inspect (temporary): click/hover previews, no global commitment.
- Pin (target): locks focus; atlas/timeline/inspector follow until cleared.

### Layers (reduce clutter without removing detail)

Viewport shows only enabled layers (toggle set):
- nodes (actors / entities)
- encounters / links
- payload primitives (optional)
- “has sources” / “no sources” coverage (optional)

### Trace mode (route planning analogue)

Explicit mode that highlights paths:
- trace actor across timeline
- trace encounter chain
- trace interference propagation

---

## Implementation plan (current)

### Phase 0 — prep / guardrails (done)

- Workbench v3 layout sanity: fit 1920×1080 at 100% zoom (no forced page zoom)
- Layout Debug HUD exists for precise remote diagnosis
- Case Map overlay exists (system-level table-map) with selection highlighting

### Phase 1 — Galaxy MVP (start now)

Goal: add a **Galaxy** tab that renders **cases as stars** from `catalog/index.json`.

Minimum behaviors:
- Render stable star positions (deterministic by slug; no reshuffle).
- Click star → inspect (focus card in-viewport).
- Double-click star → open case and transition to **System** (Case map tab).
- Breadcrumb: `Galaxy > Case` (at least).

Non-goals (later):
- filters/modes
- clustering/regions
- search
- trace

### Phase 2 — System map upgrade (after Galaxy MVP is stable)

- Replace “chip grid + link list” with a true node-link viewport (still step-zoom, not free-fly).
- Add pin/clear controls (targeting).
- Add layers toggle.
- Keep docs stable; use Focus Inspector for click results.

### Phase 3 — Moment + Trace + Modes

- Moment zoom: click timestep badge / timeline selection narrows viewport neighborhood.
- Trace mode: explicit, reversible, visually clear.
- Cross-case modes (Galaxy): mutually exclusive “lenses” for complexity management.

---

## Files to touch first (for Phase 1)

Entry / wiring:
- `/workbench-v3.html` (add Galaxy tab + includes)

Galaxy surface:
- `/ui-v3/galaxy-map.css` (new)
- `/ui-v3/galaxy-map-overlay.js` (new)

System surface glue:
- `/ui-v3/case-map-overlay.js` (allow auto-transition from Galaxy → System after opening a case)

Data:
- `/catalog/index.json` (read-only input)

---

## Reference notes (keep)

- `gui_confirmed_findings_2026-03-26.md` — confirmed UI overload + smoketest fixture needs
- `GFE_VisualCodex.md` — palette + projection rules

Legacy examples (pattern inspiration only; not “truth”):
- `/legacy/GUIv2/` — earlier UI shell + constellation/zoom patterns
