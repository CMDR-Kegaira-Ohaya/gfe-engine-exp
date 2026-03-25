# Repo Patch Tool Spec

Status: initial working spec

## Purpose

A safe development tool for targeted file surgery inside the repo.

Main use case:
- patch large files without rewriting the whole file
- support controlled migration work in monoliths
- reduce blind global replace risk

## Design goal

This should be a safe repo patch tool, not a reckless generic search/replace tool.

Core posture:
- locate
- verify
- patch
- preview diff
- abort on ambiguity

## Minimum operations

### 1. find
Locate text by:
- exact string anchor
- regex anchor

### 2. replace
Support:
- replace first match
- replace all matches
- replace exact matched block

### 3. insert
Support:
- insert before anchor
- insert after anchor
- insert at file start/end

### 4. bounded patch
Support patching between sentinels:
- begin marker
- end marker

### 5. safety checks
Require options for:
- unique match only
- exact match count expected
- fail if anchor missing
- fail if multiple matches appear unexpectedly

### 6. preview
Support:
- dry run
- compact diff preview
- no mutation until explicitly run without dry-run

## Failure path
Return explicit error when:
- file missing
- anchor missing
- multiple anchors found where one expected
- sentinel ordering invalid
- replacement would produce no change

## Non-goals

Not for:
- silent wide repo rewrites
- fuzzy AI guessing of what to patch
- schema mutation without explicit anchors
- hidden changes without diff surface
