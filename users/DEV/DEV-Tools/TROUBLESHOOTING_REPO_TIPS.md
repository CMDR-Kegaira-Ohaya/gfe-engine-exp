# TROUBLESHOOTING_REPO_TIPS

This file records stable procedures for repository troubleshooting, write-path recovery, and repeatable operational workflows for this lean core repo.

Scope:
- preserve the core repo cleanly
- prefer simple file writes for normal maintenance
- use lower-level git-object operations only when needed
- do not assume the old bootstrap maze still exists here

Current core-protected areas:
- `/engine/`
- `/solver/`
- `/cases/`
- `privacy.html`

Current DEV/reference area:
- `/users/DEV/`


## Connector boundary rule

Use Base64 for transport only. Decode once at the connector boundary. Do reasoning, comparison, summarization, and planning on plain UTF-8 text, Markdown, or JSON.

Working rule:
- avoid nested encodings or extra transport wrappers unless they are strictly necessary
- when writing, prefer small surgical patches over large whole-file rewrites whenever the tooling allows it
- connector Base64 is a transport concern, not a repo-format concern

## Known likely errors

- `401 / `403`
  - token missing, expired, or under-scoped
  - repo access not granted
  - branch or workflow permissions blocked

- `404`
  - wrong path
  - stale path from an older repo layout
  - trying to use removed bootstrap/control-surface locations

- `409` / non-fast-forward
  - branch moved ahead of the base ref used for the write
  - refresh the current branch ref, rebuild on the latest tree, then retry

- `422`
  - `saveFile` content is not valid Base64
  - missing `sha` on update
  - malformed payload
  - invalid path or unsupported update shape

- workflow write blocked
  - workflow files are protected by missing permissions
  - token or action path lacks workflow write capability

- Pages/privacy surface mismatch
  - `privacy.html` exists in repo but the published Pages URL or GPT action setting points elsewhere
  - connector metadata must match the live privacy-policy URL

## Procedure: `saveFile` content encoding

GitHub’s API for `saveFile` requires the file content to be Base64-encoded UTF-8.

Default procedure:
1. prepare the final UTF-8 text exactly as it should be written
2. Base64-encode that full text
3. pass the encoded string as `content`
4. include `sha` when updating an existing file

Markdown default:
- for `.md` files, prefer one exact replacement payload generated mechanically from the final Markdown text
- do not hand-edit Base64 for Markdown writers
- do not mix raw Markdown text and encoded payload text in the same write path unless the tool explicitly requires it

Precision note:
- if repeated `422` errors say `content is not valid Base64`, first suspect corruption in the encoded payload itself
- common causes are accidental whitespace inside the Base64 string, truncation, or mixed raw text and encoded text in the same payload

## Procedure: normal repo writes

Default write path:
1. use `getPath` if the file already exists
2. capture the current `sha`
3. write with `saveFile`
4. treat this as the normal path for repo docs and scaffold files

Operational rule:
- prefer `saveFile` over `createTree -> createCommit -> updateRef` for normal repo maintenance
- reserve low-level git-object flows for advanced multi-file construction or recovery work

## Procedure: low-level git-object fallback

Use only when the normal file-write path is clearly not sufficient.

Preferred sequence:
1. `getBranchRef` on `main` or `getRef` on the needed full ref
2> `getCommit` for the current head
3. capture the current base tree SHA from that commit
4. `createTree` with the replacement file content
5. `createCommit` with the new tree and the current head as parent
6. `updateRef` on the intended ref

Operational rule:
- after `createCommit`, success is not enough by itself
- the change is not live until `updateRef` succeeds and a follow-up `getBranchRef` or `getRef` confirms the new head SHA

## Procedure: workflow-related edits

If edits touch workflow behavior or workflow files:
- confirm workflow-write capability exists before attempting the commit
- verify the workflow file path carefully
- prefer small, explicit edits

Node runtime rule:
- from 2026-03-28 onward, treat Node 24 readiness as active maintenance
- do not add or pin stale Node-20-era GitHub Actions
- when touching workflow actions, prefer current versions that are compatible with GitHub’s Node 24 transition window

## Procedure: TOC maintenance

This repo now has an auto-generated `TOC.md`.

Working rule:
- do not hand-maintain `TOC.md`
- edit real repo contents instead
- let the TOC workflow regenerate it
- if TOC automation fails, fix the workflow or script rather than drifting the file manually

## Fallback plan

When the normal write path becomes unstable:
1. split writes into smaller files or smaller patches
2. prefer exact replacement over mixed partial edits when possible
3. refresh the latest branch state before retry
4. use alternative paths when needed:
   - GitHub UI edit
   - manual paste/commit
   - `createTree -> createCommit -> updateRef`

## Notes to extend later

Add confirmed procedures here for:
- branch creation edge cases
- workflow dispatch permission problems
- large file replacement strategy
- manual recovery steps after interrupted tool writes
