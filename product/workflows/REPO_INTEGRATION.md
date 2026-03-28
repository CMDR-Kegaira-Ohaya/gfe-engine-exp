# Repo integration

Purpose: keep product/runtime repo integration clear and untangled.

## One-way bridge

Use this model:
- repo truth and operating memory live in DEV docs
- runtime uses a distilled bridge under `product/app/repo/`
- the GUI must not read `users/DEV/` markdown directly at runtime

## Bridge responsibilities

The repo bridge should provide:
- repo profile
- guardrails
- connector boundary handling
- verification
- commands for allowed write flows

## Write model

Use:
- GUI intent → command → guardrail check → connector call → verification → UI update

Do not use:
- scattered raw save calls from random GUI components
- runtime parsing of DEV markdown to decide write permissions
- product writes into protected core zones by convenience

## Zone summary

Protected:
- `engine/`
- `solver/`
- `privacy.html`
- `/.github/workflows/` unless explicitly allowed
- workflow-managed files like `TOC.md`

Controlled:
- `cases/`

Normal product-local:
- `product/`

## Connector boundary rule

- Base64 is transport-only
- decode once at the connector boundary
- reason and compare on plain UTF-8 / Markdown / JSON

## Near-term implementation order

1. keep the current product slice stable
2. add repo bridge modules
3. add first safe commands
4. only then add richer save/edit flows to the GUI
