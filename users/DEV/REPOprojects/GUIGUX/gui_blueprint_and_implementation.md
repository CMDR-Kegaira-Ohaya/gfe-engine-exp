# GUI Blueprint and Implementation (Temporary)

**Purpose:** This is a temporary working board for the v3 reader UI while the frontend is actively shifting from baseline shell to semantic reader.

Use it to:
- keep live repo truth in one place
- record what is locked vs what is actively transitional
- keep the next frontend slice narrow and implementation-led
- avoid planning from outdated chat state or old UI images

Do not use this board as:
- engine canon
- backend doctrine
- builder doctrine
- permanent repo memory

---

## Repo reality snapshot

Current repo truth:
- canonical case browsing comes from `/catalog/index.json`
- canonical case artifacts live under `/cases/<slug>/...`
- case source loads from `source/case.md`
- case encoding loads from `revisions/<case_revision_id>/encoding.json`
- saved reading is optional
- `ui-v2/` and `workbench-v2.html` are gone
- active v3 entry files are:
  - `/workbench-v3.html`
  - `/ui-v3/app.js`
  - `/ui-v3/styles.css`
  - `/ui-v3/palette.css`
  - `/ui-v3/family-pass.js`

---

## Product posture

v3 remains **reader-first**.

Thhe GUI owns:
- browse
- open
- read
- inspect
- navigate timeline
- navigate atlas
- show artifact status
- show provenance and what is missing

 GPT-side owns:
- generate
- save
- delete
- promote
- package
- repo mutation
- workflow dispatch

---

## Locked artifact language

Use this user-facing family consistently:
- **Case**
- **Case encoding**
- **Case reading**
- **Case package**

Use these loading phrases:
- **Open case**
  - Load from repo
  - Import files
- **Open case package**
  - Load from repo
  - Import files

---

## Live implementation state (actual)

What is live now:
- header actions area includes:
  - `Actions`
  - `Clear`
  - `Delete`
- `Actions` opens a compact drop-down panel with:
  - `Open case`
  - `Open case package`
  - `Generate reading`
  - minimal Inspect note
- left column now has:
  - a **persistent Relation Atlas** area
  - a secondary open/package/reading-placeholder surface beneath it
- center tabs are live and are:
  - `Case`
  - `Case encoding`
  - `Case reading`
- timeline is no longer a compact selector list:
  - one step is expanded at a time
  - each expanded step shows actors and actions
  - clicking an actor sets participant focus
  - clicking an action sets encounter focus
- the Relation Atlas now responds to:
  - step overview
  - participant focus
  - encounter focus
  - V / H / R lens switching
- the shell now uses the live palette foundation in `ui-v3/palette.css`
- axis-level semantic coding is live in atlas/detail surfaces
- first family treatment is live only in payload primitives via `ui-v3/family-pass.js`
- a compact family summary row now appears above primitive bundles

This means v3 is now past shell-baseline work and is in a **semantic consolidation phase**.

---

## Target screen model (still valid)

### Screen name

**Case reader screen**

### Layout target
- quiet header
- slim `Actions` command button
- compact drop-down actions panel under that button
- persistent left **Relation Atlas**
- center **Case / Encoding / Reading** reading area
- bottom **Timeline** with one expanded step

### Reading hierarchy
- timeline = primary navigation spine
- atlas = primary interpretive instrument
- center panel = primary reading surface
- actions panel = secondary command surface

---

## Relation Atlas target

The left system is the **Relation Atlas**, local to the selected timestep.

Focus switck:
- **Participant focus**
- **Encounter focus**

Lens switck:
- **Structure (V)**
 - **Relations (H)**
 - **Expression (R)**

Rules:
- changing focus does not change the selected step
- changing lens does not change the selected focus
- atlas should be the first place where semantic visual grammar becomes full and coherent

---

## Visual doctrine (reference)

See `GFE_VisualCodex.md` for the live visual codex.

Current locked visual direction:
- calm research terminal
- restrained glow
- soft, readable contrast
- slightly softened geometry
- clear status language
- motion for understanding, not decoration
- System color = L Leg
- Ruin = #000000
- Θ = bare glyph, strict typiography, bidirectional reversal gate

---

## Current gaps (refreshed)

The biggest gap now is not "layout missing."
It is **semantic consolidation.**

Gaps from live state to target:
- atlas semantics are now partially implemented but not yet evenly distributed across all atlas surfaces
- family semantics are live only in payload primitives and are currently staged through a post-render pass
- it is not yet decided whether family treatment remains a staged pass or moves into native rendering
- Ruin and Θ are doctrinally defined but remain unimplemented because the current live case data does not yet show a clean hook for them
- motion doctrine exists, but no motion should be introduced until atlas semantic surfaces are stable
- `ui-v3/app.js` remains a large integrated file; splitting it should wait until boundaries are stable, not be done for neatness alone

---

## Architecture status

Strong:
- shell direction
- timeline-first interaction
- atlas focus model
- palette foundation
- axis-level semantics

 Transitional:
- family-pass.js as a staged render-patch
- partial family rollout
- uneven semantic density across atlas surfaces

Paused until evidence/stability:
- Ruin visual pass
- Θ operator pass
- motion pass

---

## Immediate work order (current)

This is the active order of work now:

1. **Refresh the GUI working board**
  - keep this file in sync with live repo reality

 2. **Consolidate atlas semantics**
  - even out the semantic language across existing atlas surfaces
  - don't add much more new visual vocabulary before this is coherent

3. **Decide whether family treatment stays staged or becomes native**
  - make this decision before family semantics spread much wider

4. **Keep Ruin / Θ paused until the data path is explicit**
  - do not invent repo meaning where the live cases do not support it

 5. **Add motion only after semantic surfaces are stable**
   - motion must clarify interaction, not cover incompleteness

---

## Success condition for the current phse

A user should be able to:
- open a case from the canonical catalog without explanation
- understand where they are on screen
- move through timesteps naturally
- click actor or action and see the atlas respond immediately
- switch between Case / Encoding / Reading without confusion
- begin to read semantic distinctions in the atlas without needing a model lesson
- not yet need Ruin, Θ, or motion to understand the basic reader

---

## Next active frontend slice

Next implementation work should be:
- atlas-semantic consolidation, not broader shell restyling
- an explicit decision on family-pass.js vs native family rendering
- no Ruin / Θ implementation until the data path is real
- no motion pass until the atlas semantic surfaces are consistent

