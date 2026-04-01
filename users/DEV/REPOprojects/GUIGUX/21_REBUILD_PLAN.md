# GUIGUX rebuild plan (current)

[GUIGUX_REBUILD_PLAN_ROOT]

Purpose: this is the current working plan for the next GUI/workbench rebuild.

Authority:
- if anything here conflicts with `10_SCOPE_LOCK_PIPELINE.md`, the scope lock wins
- `20_WORKING_BOARD.md` serves as working memory/reference material, not as the primary plan
- `22_PRODUCT_OPERATING_MAP.md` holds the whole-product layer map so feature work does not drift into isolated additions

---

## 1) Product core (locked)

- This product exists to make GFE visible in a clear enough form that others can inspect it, test it, and decide what, if anything, should become of it.
- The first screen should show the studied case as a whole map, in the primary mode implied by solved structure.
- The first thing the user should be able to do is look around and see what the framework did to the case: source → structure → narrative return.

---

## 2) High-level UI doctrine (locked)

- the app is not mainly a reader, dashboard, or tutorial
- it is a **transformation viewer**
- whole before parts
- solved structure before commentary
- transformation before explanation
- orientation must survive every click
- documents stay stable and secondary: source and narrative are companion surfaces, not the main view

---

## 3) Behavior patterns to keep

Keep these from the older board:
- viewport-first thinking
- stable documents contract
- inspect vs pin distinction
- layers as clutter control, not meaning control
- trace as explicit mode
- phased build discipline

Do not carry over blindly:
- old implementation assumptions
- old shell-specific polish goals
- assumptions that an earlier GUI remains the canonical live surface

---

## 4) Build doctrine (locked)

- no giant monolithic files
- no all-purpose controllers
- thin shell, strong modules, explicit state
- each file owns one job
- missing artifacts fail honestly, not mysteriously
- DEV notes guide development but do not become runtime dependencies

---

## 5) Current modular target shape

The product rebuild inside `product/` should remain based on small cooperating modules:

- boot shell
- app shell
- data/loader (`CaseBundle`)
- state store
- specified view (whole solved map)
- context panel
- documents panel
- interactions (selection, pin, trace)
- lenses (structure, process, evidence)
- filters (visibility reduction only)
- repo bridge (profile, guardrails, commands, verification)

### CaseBundle minimum

CaseBundle must contain:
- identity
- status
  - structural: `solved | provisional | absent`
  - artifacts: source / encoding / solve / narrative
- source
- structure
- solve
- narrative
- projection hints
- link layer (source ↔ structure ↔ narrative)

---

## 6) Repo-aware GUI bridge (locked)

The GUI will eventually perform saves, edits, and other repo actions.

To keep this useful but not tangled:
- repo knowledge stays in DEV docs as human-facing memory/doctrine
- runtime uses a distilled machine contract under `product/app/repo/`
- the GUI must **not** mine `users/DEV/` markdown directly at runtime
- when a DEV rule becomes runtime-relevant, promote it once into the repo bridge layer

### Bridge shape

Under `product/app/repo/` keep:
- `repo-profile.js`
- `guardrails.js`
- `verify.js`
- connector boundary module
- `commands/`

### Repo zones

Protected:
- `engine/`
- `solver/`
- `privacy.html`
- `/.github/workflows/` unless explicitly allowed

Controlled:
- `cases/`

Normal product-local:
- `product/`

---

## 7) Build location (locked)

This repo supports a quarantined product area under `product/`.

That means:
- core remains protected in `engine/`, `solver/`, `cases/`, and `privacy.html`
- GUI/app runtime work lives in `product/`
- DEV notes stay in `users/DEV/`
- the repo remains the canonical template/source

---

## 8) Current execution order

1. Treat solver coverage and the Phase 0 proof base as closed inputs on current main.
2. Decide and make explicit the canonical public/live entry surface.
3. Validate one real browser-level public path:
   - open one case
   - show the whole solved map
   - let the user inspect targets without losing orientation
   - keep source and narrative visibly connected without hijacking the map
4. Tighten projection correctness:
   - specified view clearly primary
   - context/documents supportive, not dominant
   - inspect / pin / trace hierarchy clear
   - repo panel mutation stays secondary to the viewing surface
5. Only after the above:
   - refine Evidence lens
   - add filters as clutter control only
   - strengthen source → structure → narrative correspondence hints carefully
   - expand richer mutation/edit flows

---

## 9) Success condition for the current lane

The current lane is closed when:
- the canonical public product surface is unambiguous
- a user can open it and read the solved structure without special coaching
- the map/view is visibly primary
- documents remain stable and secondary
- repo-facing controls no longer compete with the product center of gravity

---

## 10) How to use this file

- use this as the current next-build plan
- use `20_WORKING_BOARD.md` for working memory, not structural truth
- use `22_PRODUCT_OPERATING_MAP.md` to keep the whole product readable as one system
- any new GUI/UX notes should extend this direction, not reset back into solver-rescue work

Last updated: 2026-04-01
