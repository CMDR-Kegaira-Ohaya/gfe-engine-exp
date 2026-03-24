# GUI Blueprint and Implementation (Working Board)

**Purpose:** temporary working board for the v3/frontend transition while the reader is being rebuilt toward the final atlas-first structure.

Use this file to:
- keep live repo truth in one place
- record what is now locked
- keep the current work order explicit
- avoid planning from stale chat state or obsolete implementation phases

Do not use this file as:
- engine canon
- backend doctrine
- permanent repo memory

---

## Repo reality snapshot

Current repo truth:
- canonical case browsing comes from `/catalog/index.json`
- canonical case artifacts live under `/cases/<slug>/...`
- active v3 entry files are:
  - `/workbench-v3.html`
  - `/ui-v3/app.js`
  - `/ui-v3/styles.css`
  - `/ui-v3/palette.css`
  - `/ui-v3/layout-atlas-map.css`
  - `/ui-v3/atlas-map-stage.css`
  - `/ui-v3/atlas-map-stage.js`
  - `/ui-v3/family-pass.js`

---

## Product posture

v3 remains **reader-first**.

The GUI owns:
- browse
- open
- read
- inspect
- navigate timeline
- navigate atlas
- show artifact status and provenance

GPT-side owns:
- generate
- save
- delete
- promote
- package
- repo mutation
- workflow dispatch

---

## Locked direction

These are now treated as locked for frontend direction:
- atlas is the **primary instrument**, permanently
- screen split is stable; atlas is not a temporary mode
- atlas is moving toward **native renderer structure**, not long-term staged patches
- family treatment is moving toward **native**, not long-term post-pass logic
- detail dock keeps a **stable reading grammar**
- family native scope should affect:
  - payload
  - field markers
  - detail dock
  - but **per actor**, not as one undifferentiated atlas-wide flood
- motion is for **payload effects**, not decoration
- payload motion includes:
  - direction
  - impact / arrival
  - persistence / retention traces
- no 3D/fractal/art-project detour for this workstream
- Θ must be derived from canon, not improvised visually

---

## Live implementation state (actual)

What is live now:
- stable desktop split gives atlas and reader equal screen importance
- atlas has a staged **field + fixed detail dock** structure
- field markers are clickable and derived from current atlas detail sections
- region cues exist in the atlas field
- marker/detail sync is now **bidirectional**
- overview / participant / encounter produce different field states
- marker emphasis now responds to focus mode and current focus text
- family treatment is still staged through `ui-v3/family-pass.js`

This means v3 is no longer in shell setup.
It is in a **pre-native atlas transition phase**.

---

## Design notes now locked enough to work from

### Screen model
- left side = atlas / semantic map
- right side = case reading / encoding / companion detail surfaces
- this divide is stable, not mode-switched

### Atlas model
- atlas should behave like a **semantic map**, not a card stack
- map logic is preferred over scenic illustration
- calm field first; semantic richness second
- fixed detail dock is preferred over popup-heavy interaction
- the atlas should eventually be spatial **without becoming decorative fantasy**

### Detail dock grammar
Stable reading rhythm should remain even when the selected content changes.
Working grammar:
1. context
2. summary
3. structure
4. relations
5. expression
6. payload

### Motion doctrine
- motion is instructional
- motion belongs to payload behavior and interaction understanding
- motion should explain transfer, arrival, buildup, retention, and consequence
- motion should not be atmospheric filler

### Θ / Ruin posture
- Ruin and Θ are not free decorative symbols
- Θ needs canon-faithful operational translation before native UI integration
- Ruin and Θ should not spread wider until their data path / UI rule is explicit

---

## Architecture status

Strong:
- atlas-first screen direction
- stable split
- focus model
- detail dock idea
- semantic-map direction
- payload-motion doctrine

Transitional:
- `atlas-map-stage.js` and `atlas-map-stage.css` are still staged scaffolds
- `family-pass.js` is still staged
- `ui-v3/app.js` still carries the old integrated render center of gravity

Not yet final:
- native atlas renderer structure
- native family rendering
- canon-faithful Θ integration
- payload motion layer

---

## Immediate work order (current)

1. **Refresh working-board truth**
   - keep this file and the visual codex lean, current, and non-redundant

2. **Stop expanding staged refinements as if they were final architecture**
   - staged layers may still exist briefly, but no longer define direction

3. **Begin native atlas renderer rebuild now**
   - migrate atlas field / zones / markers / detail dock into native render structure
   - reduce dependence on post-render wrapping logic

4. **Move family from staged to native**
   - preserve per-actor behavior
   - thread family through payload + field marker + detail dock surfaces

5. **Translate canon into explicit UI rule for Θ**
   - do not improvise beyond canon

6. **Add payload motion only after native atlas structure is in place**
   - motion must clarify payload behavior, not compensate for architectural transition

---

## Current biggest risks

- leaving transitional wrappers in place too long and mistaking them for architecture
- letting visual additions outpace canon-faithful semantic rules
- letting working docs become repetitive and stale
- integrating Θ visually before its operational UI rule is explicit

---

## Success condition for the current phase

A user should be able to:
- read the atlas as the primary instrument
- move between overview / participant / encounter without relearning the interface
- understand that field, region, marker, and detail are one connected system
- read payload and family distinctions without needing the old staged logic to explain them
- later receive motion as clarification, not as compensation
