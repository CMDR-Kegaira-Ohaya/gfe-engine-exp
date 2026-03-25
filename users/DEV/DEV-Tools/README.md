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
- start with a safe repo patch/search-replace tool
- expand only when a tool has a clear repeated use case

Working rules:
- prefer narrow tools over general-purpose dangerous tools
- require explicit anchors and predictable failure behavior
- prefer preview/diff before mutation
- fail loudly on ambiguity
