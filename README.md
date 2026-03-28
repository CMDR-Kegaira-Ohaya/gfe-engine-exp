# GFE Engine Exp — Core Repo

This repo is now a core-first repo for GFE material, with a quarantined product area for new GUI/app work under `/product/`.

See `TOC.md` for the current auto-generated repository map.

## What is kept here

- `/engine/` — canonical GFE source texts
- `/solver/` — executable implementation and validation layer
- `/cases/` — reference, demo, and smoke case material
- `/product/` — quarantined product/GUI/app work area
- `/users/DEV/` — local DEV working space and useful migration references

## Working rules

- Treat `/engine/`, `/solver/`, and `/cases/` as the preserved core.
- Treat `/product/` as the only place where new GUI/app runtime work should live.
- Treat `/users/DEV/` as a local working/reference area, not canon and not runtime.
- Do not recreate the old layered bootstrap maze here.
- Do not let product work bleed into core folders casually.

## Directory inner meaning

- `engine/` = GFE doctrine core
- `solver/` = executable solver core
- `cases/` = case material and artifacts
- `product/` = isolated product/GUI/app build zone
- `users/DEV/` = DEV-local tools, notes, and surviving working references

## Operating posture

This repo stays the template/source repo.
The core stays protected.
New product work can proceed here, but only inside the `quarantined` `product/` area.
