# GUIGUX working board

[GUIGUX_WORKING_BOARD_ROOT]

This is the active DEV working board for the GUI/UX lane.

If anything in this file conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins.

Last updated: 2026-03-27

---

## Current lane (locked)
- user-visible polish and projection correctness
- maintain solver authority on structure
- GUI is projection: solved structure primary, overlays secondary

See: `10_SCOPE_LOCK_PIPELINE.md` → [GUIGUX_PIPELINE_CONTRACT] and [GUIGUX_GUI_PROJECTION_CONTRACT]

---

## Immediate priorities
1) **Case Map (Case Space) projection spec**
  - define the minimal node/link model for projecting solver structure into a navigable map/space
  - define selection/focus behavior:
    - selection updates the **Focus Inspector**
    - selection highlights neighbors visually and via a nested connection list
    - selection does **not** rewrite global documents

2) **Stable documents panel contract**
  - one stable panel containing:
    - Full Case (source)
    - Full Result (synthesized reading/brief)
   - fixed width, internal scroll; never resizes the Case Map
  - optional “Find in Full Case/Result” highlight/search (no forced scroll jump)

2) **Inspection surfaces remain optional**
   - encoding/timeline/atlas detail behind an “Inspect” affordance
   - do not compete with the Case Map in default mode 

2) **Smoke fixture usage**
   - default case should remain the canonical GUI smoke modern case
  - keep smoke tests green in both local and deployed

---

## Reference files in repo (implementation touchpoints)
- Entry: `/workbench-v3.html`
- Controller: `/ui-v3/app.js`
- Atlas: `/ui-v3/atlas-renderer-core.js`, `/ui-v3/atlas-renderer.js`
- Catalog: `/catalog/index.json`
- Smoke tools: `/tools/js/gui-live-smoke.mjs`, `/tools/js/gui-pages-live-smoke.mjs`
- Deploy: `/.github/workflows/gui-deploy-verify.yml`
- Operator check: `npm run gui:validate-chain -- --base-ref HEAD~1 --head-ref HEAD --copy-scan`

---

## Existing notes (do not lose)
- `gui_confirmed_findings_2026-03-26.md` — confirmed UI overload + smoke-fixture findings (append-only)
- `GFE_VisualCodex.md` — visual doctrine (palette + atlas/projection design rules)

Note:
- the prior gui_blueprint_and_implementation.md` working board was consolidated into `10_SCOPE_LOCK_PIPELINE.md` and this `20_WORKING_BOARD.md`, then removed to reduce drift. Git history retains it if needed.
