# GFE Engine Exp — Core Repo

This repo is now a lean preservation repo for the GFE core, not the old bootstrap/GUI/self-referential maze.

See `TOC.md` for the current auto-generated repository map.

## What is kept here

- `/engine/` — canonical GFE source texts
- `/solver/` — executable implementation and validation layer
- `/cases/` — reference, demo, and smoke case material
- `/users/DEV/` — local DEV working space and useful migration references

## What this repo is not

- Not the public GUI repo
- Not the old bootstrap/control-surface system
- Not a graveyard for old interface iterations

## Working rules

- Treat `/engine/`, `/solver/`, and `/cases/` as the preserved core.
- Treat `/users/DEV/` as a local working/reference area, not canon.
- Do not recreate the old layered bootstrap maze here.
- Any new public app or GUI should live in a fresh repo.

## Directory inner meaning

- `engine/` = GFE doctrine core
- `solver/` = executable solver core
- `cases/` = case material and artifacts
- `users/DEV/` = DEV-local tools, notes, and surviving working references

## Next split

This repo can stay as the core/archive source.
Any new user-facing product, GUI, or public projection should be built cleanly in a separate new repo.
