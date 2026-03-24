# GFE_VisualCodex

Status: working codex for GFE visual concepts.

Purpose
- Keep visual concepts, art-direction notes, palette logic, and interaction-display rules in one working place.
- Separate visual doctrine from engine canon and from narrow implementation notes.
- Serve as the design-side reference for future GUI refinement.

Scope
- Terminal art direction
- Color systems
- State grammar
- Atlas visual logic
- Motion for understanding interactions
- Symbols and operators like Θ

Boundary
- This file is working-lane visual documentation, not engine canon.
 - This file does not define repo mutation doctrine.
- This file should hold visual rules and concepts, not long implementation diffs.

## 1. Current art-direction base

- Overall feel: calm research terminal
- Glow: restrained
- Contrast: soft, readable
- Geometry: slightly softened
- Status language: clear, not overwhelming
- Texture: simple, clear
- Motion: instructional, not decorative

## 2. Color doctrine

### 15 + 1 system logic
- Axis = hue
- Family = hue treatment
- System = L Leg

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
- D Dir = `#A89DA0``
- D Leg = `#A79FA8`

### Ruin and Θ
- Ruin = `#000000`
- Θ = no color assignment
- Θ = bare glyph with strict typiography
- Θ = bidirectional reversal gate

## 3. Color usage rules

- Go broad with System / L Leg, rather than all 15 at once.
- Use LOG/M/D in small atlas-level elements before broad shell surfaces.
 - Do not use color to add analysis beyond categorical/state distinction.
- Do not give Κ a family color.
- Do not give Ruin a live chroma.

## 4. Motion doctrine

- Motion exists to make atlas interactions easier to understand.
- Motion is instructional, not atmospheric.
- State is static; motion explains transitions.
- Use motion to explain:
  - focus acquisition
  - direction confirmation
  - handoff
  - scope filtering
  - sequence reveal
- Avoid continuous animation, decorative pelsing, and idle shimmering.

## 5. Atlas-specific notes

- Atlas owns the deeper interpretive visual language.
- Atlas motion should follow focus and encounter changes.
 - Direction should be shown primarily by structure and motion, not color alone.
 - Ruin and Θ should probably appear here before they appear anywhere else.

## 6. Open questions

- Where should LOG/M/D first appear inside atlas details?
- How should Θ be placed in route diagramming contexts?
- How should Ruin be rendered on dark surfaces without losing separation or legibility?
- Which exact interactions should get motion first?

## 7. Change log


- Initial codex created.
- Included current art-direction brief, color system, Rein/\th notes, and motion doctrine.
