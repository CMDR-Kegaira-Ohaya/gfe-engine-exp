# Instructions Index

This file is the operational instructions surface for repo-useful tools, procedures, and operator conventions.
It is not canonical engine doctrine. It supplements `/main/TOC.md` and `main/GPT_OPERATOR_MANUAL.md`.

## Use from boot
- Start at `/main/TOC.md`
- Then read `main/GPT_OPERATOR_MANUAL.md`
- Then use this file for tooling, procedures, and operational helpers

- Use `/PROCEDURE_INDEX.md` for troubleshooting and repowrite recovery

## Cross-links
- Bootstrap: `/main/TOC.md`
- Operator manual: `/main/GPT_OPERATOR_MANUAL.md`
- Edit governance: `/main/EDIT_RULES.md`
- Troubleshooting and repo recovery: `/PROCEDURE_INDEX.md`
- JavaScript tools usage: `/tools/js/README.md`

## Operational tools

### JavaScript parser tooling
Use this when the task concerns imports, exports, syntax validity, dependency edges, or JS structure.

Install:
```bash
npm install
```

Commands:
```bash
npm run js:check -- ui-v2/app.js
npm run js:symbols -- ui-v2/app.js
npm run js:deps -- ui-v2/app.js
npm run js:find -- ui-v2/app.js render
npm run js:summary-all
```

What it gives:
- syntax check via Node `racheck`
- full AST parsing via Acorn
- import/export summaries
- dependency edges
- identifier lookup
- batch summaries across `ui/`, `ui-v2/`, and `/solver/`

Boundaries:
- this is for structural inspection, not for doctrine
- it does not replace canonical engine files
- it does not yet cover JSX or TypeScript

## When to use these instructions
- when a tool or procedure should be known from boot
- when a repo capability is operational, repeatable, and not canonical doctrine
- when usage should be cross-linked with procedures or tooling

```
If a new repo-useful tool is added, list it here and add a cross-link from `/main/TOC.md`.
```
