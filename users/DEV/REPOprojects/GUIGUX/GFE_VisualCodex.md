<!--
[GUIGUX_VISUAL_CODEX_ROOT]

Visual doctrine for GUI/UX. Must remain consistent with `10_SCOPE_LOCK_PIPELINE.md` .
iThis file does not override engine canon or solver doctrine.
Last stamped: 2026-03-27
-->


# GFE_VisualCodex

Status: working codex for GFE visual concepts.

Purpose:
- keep visual doctrine, palette logic, interaction-display rules, and atlas-facing design notes in one working place
- separate visual working doctrine from engine canon
- avoid long implementation archaeology here

Boundary:
- this file is visual working doctrine, not engine canon
- this file should hold locked visual rules and near-term design notes
- avoid stale option lists once decisions are made 

---

## 1. Current art-direction base

- overall feel: calm research terminal
- glow: restrained
- contrast: soft, readable
- geometry: slightly softened
- status language: clear, not overwhelming
- texture: simple, clear
- motion: instructional, not decorative

---

## 2. Color doctrine

### 15 + 1 system logic
- axis = hue family
- family = hue treatment
- system = L Leg

### L family
- L Cfg = `#00FFF1`
- L Emb = `#15BF25`
- L Org = `#169AFF`
- L Dir = `#F46F8C`
- L Leg = `#F6ADFF`

### M family
- M Cfg = `#FFF199`
- M Emb = `#FFFF00`
- M Org = `#FF7B00`
- M Dir = `#FF000E`
- M Leg = `#95007A`

### D family
- D Cfg = `#A2AEAD`
- D Emb = `#979E97`
- D Org = `#939DA7`
- D Dir = `#A89DA0`
- D Leg = `#A79FA8`

### Ruin and Θ
- Ruin = `#000000`
- Θ = no color assignment
- Θ = bare glyph with strict typography
- Θ = bidirectional inversion gate
- final Θ UI behavior must follow canon, not free visual invention

---

## 3. Color usage rules

- use system / L Leg broadly before spreading full 15-state coding everywhere
- use L / M / D in semantically tight surfaces first
- do not use color to add analysis beyond categorical/state distinction
- do not give Θ a family color
- do not give Ruin live chroma

---

## 4. Atlas doctrine

- atlas is the primary visual instrument
- atlas should evolve as a **semantic map**, not a card stack
- atlas should be spatial without becoming scenic or illustrative fantasy
- preferred map logic:
  - points
  - vectors
  - areas
  - shapes
- fixed detail dock is preferred over popup-heavy interaction
- stable split: atlas keeps permanent equal screen presence

### Reading posture
- same instrument, different reading states
- overview / participant / encounter should feel strongly related, lightly distinct
- meaning should gather, not scatter
- eye travel should feel natural and low-chaos

---

## 5. Detail dock doctrine

Stable rhythm should remain even when content changes.
Working order:
1. context
2. summary
3. structure
4. relations
5. expression
6. payload

---

## 6. Motion doctrine

- motion exists to make interactions easier to understand
- motion is instructional, not atmospheric
- state is mostly static; motion explains transfer and change
- motion priority belongs to payload behavior

Use motion to explain:
- direction / travel
- impact / arrival
- handoff
- buildup / retention
- persistence traces

Avoid:
- continuous decorative animation
- idle shimmer
- motion that covers semantic incompleteness

---

## 7. Current implementation-facing notes

- current atlas-map field is still staged in implementation terms
- native renderer migration is the next architectural direction
- current family rendering is still staged; target direction is native
- Θ remains visually constrained until canon-faithful UI translation is explicit

---

## 8. Near-term design notes

- keep the atlas calm while migrating to native structure
- cleaner semantic labels for field markers will help readability
- payload motion should arrive only after native atlas structure is in place
- avoid accumulating visual notes that belong in obsolete staged phases
