# GUIGUX working board

[GUIGUX_WORKING_BOARD_ROOT]

This is the active DEV working board for the GUI/UX lane.

If anything in this file conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins.

Last updated: 2026-03-27

---

## Current lane (locked)
- User-visible polish and projection correctness
- Maintain solver authority on structure
- GUI is projection: solved structure primary, overlays secondary

See: `10_SCOPE_LOCK_PIPELINE.md` → [GUIGUX_PIPELINE_CONTRACT] and [GUIGUX_GUI_PROJECTION_CONTRACT]

---

## Immediate priorities
1) **Case Space projection spec**
   - define minimal node/edge model for projecting solver structure into a navigable case-space
   - define selection behavior (focus) and how side panel follows focus

2) **Secondary panel contract**
   - side panel only
   - toggle: Full Case / Synthesized Result
  - fixed width, internal scroll
  - never resizes the Case Space

3) **Inspection surfaces remain optional**
   - encoding/timeline/atlas detail behind an “Inspect” affordance
   - do not compete with the Case Space in default mode

4) **Smoke fixture usage**
   - default case should be the GUI smoke modern case (canonical)
   - keep smoke tests green in both local and deployed

---

## Reference files in repo (implementation touchpoints)
- Entry: `/workbench-v3.html`
- Controller: `/ui-v3/app.js`
- Atlas: `/ui-v3/atlas-renderer-core.js`, `/ui-v3/atlas-renderer.js`
- Catalog: `/catalog/index.json`
- Smoke tools: `/tools/js/gui-live-smoke.mjs`, `/tools/js/gui-pages-live-smoke.mjs`
- Deploy: `/.github/workflows/gui-deploy-verify.yml`

---

## Existing notes (do not lose)
- `gui_blueprint_and_implementation.md` — older working board + file pointers (still useful; may contain legacy sections)
- `gui_confirmed_findings_2026-03-26.md` — confirmed UI overload + smoke-fixture findings
- `GFE_VisualCodex.md` — visual doctrine (palette + atlas projection rules)
