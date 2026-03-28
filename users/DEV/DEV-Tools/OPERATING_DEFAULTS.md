# OPERATING DEFAULTS

Core working defaults for this lean core repo.

Use these as standing operational discipline, not as product canon.

## Write-path defaults

- prefer anchored/surgical edits over blunt whole-file rewrites when the target is small
- prefer dry-run, report, audit, or diff before mutation when the tooling supports it
- for routine repo changes, prefer `saveFile` over lower-level ref movement
- use low-level git-object flows only when the normal path is clearly not enough

## Connector defaults

- use Base64 for transport only
- decode once at the connector boundary
- do reasoning, comparison, summarization, and planning on plain UTF-8 text, Markdown, or JSON
- avoid nested encodings or extra transport wrappers unless strictly necessary

## Repo-truth defaults

- do not repeat repo truth in temporary carryover artifacts when the repo already holds it canonically
- do not let DEV notes act like core doctrine
- if DEV material conflicts with `engine/`, `solver/`, or `cases/`, the core wins

- when the repo already holds the truth, link to it instead of restating it

## Cross-session red flags

- huge GitHub write streams can cause lag, derail the session, and obscure whether a write actually landed
- blunt whole-file rewrites are a bad default when a smaller anchored patch would do
- do not claim a change is live until the branch ref or file state actually confirms it
- do not rebuild the old bootstrap/control-surface maze inside this repo

- do not let DEV sprawl become the next mess

## Workflow defaults

- when touching workflows, plan for Node 24 compatibility now, not later
- avoid stale Node-20-era actions or bindings
- prefer small, explicit workflow edits with clear verification afterward

## Use

if a situation is unclear, default to:
1. smaller, more anchored change
2. clearer verification
3. less encoding/connector complexity
4. more repository-truth discipline
