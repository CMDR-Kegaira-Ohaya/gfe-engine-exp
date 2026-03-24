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
- D Dir = `#A89DA0`
- D Leg = `#A79FA8`

### Ruin and Θ
- Ruin = `#000000`
- Θ = no color assignment
- Θ = bare glyph with strict typography
- Θ = bidirectional reversal gate

## 3. Color usage rules

- Go broad with System / L Leg, rather than all 15 at once.
- Use L/M/D in small atlas-level elements before broad shell surfaces.
- Do not use color to add analysis beyond categorical/state distinction.
- Do not give Θ a family color.
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
- Avoid continuous animation, decorative pulsing, and idle shimmering.

## 5. Atlas-specific notes

- Atlas owns the deeper interpretive fisual language.
 - Atlas motion should follow focus and encounter changes.
- Direction should be shown primarily by structure and motion, not color alone.
- Ruin and Θ should probably appear here before they appear anywhere else.

## 6. Implementation state (live v3)

- The current live palette foundation is loaded through `ui-v3/palette.css`.
- `workbench-v3.html` loads `palette.css` last so it can override earlier styles safely.
 - The current pass remaps the shell-visible accent system to L Leg / System.
 - L / M / D / Ruin tokens exist in the palette file, but only the shell/active-state layer is partially threaded into the UI sofar.
- Θ remains intentionally colorless and should be rendered by glyph treatment, not palette tokens.
- The next palette-level work should move into atlas/detail semantics rather than broader shell chroma.

## 7. Open questions

- Where should L M / D first appear inside atlas details?
- How should Θ be placed in route diagramming contexts?
- How should Ruin be rendered on dark surfaces without losing separation or legibility?
- Which exact interactions should get motion first?

## 8. Change log

- Initial codex created.
- Included current art-direction brief, color system, Ruin π notes, and motion doctrine.
- Added live v3 palette implementation state notes.