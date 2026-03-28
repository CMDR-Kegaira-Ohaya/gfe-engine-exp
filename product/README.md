# Product area

This is  the quarantined product zone for new GUI/app work in this repo.

Working rules:
- keep core material outside this area
- keep runtime GUI and app work inside this area
- do not put DEV memory notes here
- do not let this area restructure `/engine/`, `/solver/`, or `/cases/``

## Subdirectories

- `gui/` — user-facing GUI surfaces and rendering
- `app/` — app-level logic, loading, state, and wiring
- `assets/` — static assets for the product area
- `workflows/` — product-specific workflow notes, templates, or support material

# Note
Live GitHub Actions still belong in `/.github/workflows/` when needed. `/product/workflows/` is for product-local structure and reference, not active GitHub workflow execution.
