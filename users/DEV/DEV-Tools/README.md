# DEV-Tools

Purpose:
- hold DEV-facing tools used to accelerate repo work
- keep tool specs and tool-local notes together
- provide a stable local lane for development utilities

Scope:
- these are development tools, not engine canon
- tools here should prefer safe, explicit, reviewable operations
- avoid vague utility sprawl

Current intent:
- start with narrow, re-usable DEV assets
- expand only when a tool or note has a clear repeated use case

## Key working notes

- `OPERATING_DEFAULTS.md` = standing DEV working discipline for this lean core repo
- `TROUBLESHOOTING_REPO_TIPS.md` = repeatable write/recovery/solved-problem procedures
- `GPT_DISTRIBUTION_MODEL.md` = per-recipient GPT + repo + token distribution model
- `REPO_COPY_HANDOFF_CHECKLIST.md` = hand-off checklist for recipient instances
- `openapi_gfe_repo_template.yaml` = action schema template with replaceable owner/repo placeholders
- `repo_patch_tool.py` + `repo_patch_tool_spec.md` = narrow patching helpers/references

## Working rules

- prefer narrow tools over general-purpose dangerous tools
- require explicit anchors and predictable failure behavior
- prefer preview/diff before mutation
- fail loudly on ambiguity
- keep per-recipient GPT/repo/token distribution sealed, not shared
