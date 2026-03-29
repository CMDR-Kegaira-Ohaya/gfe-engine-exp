# Product slice validation status (2026-03-29)

[PRODUCT_SLICE_VALIDATION_STATUS_2026_03_29]

Purpose: capture where the current product slice actually stands against the rebuild plan, so next work can stay aligned with the locked lane instead of drifting into isolated infrastructure or polish.

---

## 1) Current plan position

Relative to `21_REBUILD_PLAN.md`.

We are:
 - past the repo-bridge block
 - inside the first working slice
 - not yet at `first slice closed` or at  `formal next layer` status

This means:
- the repo/connector/mutation foundation is no longer the primary blocker
- the next crucial work is projection correctness and live slice closure, not more repo plumbing by default

---

## 2) What is solid

- `product/` is the actual build zone
- modular shape exists across `product/app/`, `product/gui/`, and `./app/repo/`
- repo-aware bridge exists and is now credible
- normal writes use verified `saveFile`
- hard deletes no longer rely on broken `deleteFile` behavior
- the first guarded product-local delete UP path exists (app helper + repo panel)

---

## 3) What is still open before calling the first slice closed

- the current public/live surface is still root -> `workbench-v3.html`, not clearly the new `product/` index as canonical entry
- the first-slice checklist needs a live browser-level closure pass
- projection correctness still needs explicit judgment acrosk:
  - whole-map first signal
  - documents stay stable and secondary
  - inspect/pin/trace behavior feels clear
  - repo panel mutation does not steal the product center of gravity
- we have implementation for richer mutation than the plan needed at this stage, so the risk is starting to let the mutation layer outrun the viewing layer

---

## 4) Current priority order
Do these next, in this order:

### 4.1 Live slice closure
- validate the actual public entry surface
- decide whether the new `product/` index should be the canonical live surface
- close the first slice checklist with a real browser-feel decision, not code-structure alone

### 4.2 Projection refinement
- tighten specified view so the whole-before-parts contract is immediately obvious
- tighten context and documents so they support the map without becoming the main screen
- check inspect/pin/trace hierarchy against the visual rules in `22_PRODUCT_OPERATING_MAP.md`

### 4.3 Only after the above
- refine Evidence lens
- add filters as clutter control only
- strengthen source -> structure -> narrative correspondence hints carefully
- only then expand richer mutation/edit flows

---

## 5) Open risk to watch

- the repo panel is useful but must not become the new center of the product
- delete and save successes can create a false sense that we are "further along" than the viewing/orientation layer actually is
- don't let more mutation surface area arrive before the first slice is clearly good to use

---

## 6) Simple status line

Current status:
**foundation strong, first slice present, live closure still needed, next major work = projection correctness before more feature expansion.**
