# Token Permission Surface

This file records the current **effective token permission surface** available to the GPT/operator in this repository context.
It is operational, not canonical engine doctrine.

This file covers:
- which GitHub permission families are currently enabled on the live token
- the practical authority width implied by that permission set

This file does **not** define:
- the custom GPT API action surface
- repo governance doctrine
- branch protection or repository policy behavior

Do not collapse those layers.
A token permission may exist while the custom GPT API action does not expose a matching operation.
A token permission may also exist while repository policy still blocks the action.

## Capability layers

Distinguish three layers:
1. **Connector action surface**
   - which operations the custom GPT API action exposes
2. **Token permission surface**
   - which of those operations the currently configured token is authorized to perform
3. **Repo policy surface**
   - which operations still depend on branch protection, workflow settings, merge policy, or other repository rules

This file covers **Layer 2 only**.
Read `/main/GPT_CAPABILITY_SURFACE.md` for Layer 1.
Read `/main/EDIT_RULES.md` and related repo-operating docs for Layer 3.

## Current enabled token permissions

As currently configured, the token has at least:

- **Metadata** — read-only
- **Actions** — read / write
- **Actions variables** — read / write
- **Code** — read / write
- **Commit statuses** — read / write
- **Custom properties for repositories** — read / write
- **Deployments** — read / write
- **Issues** — read / write
- **Merge queues** — read / write
- **Pages** — read / write
- **Pull requests** — read / write
- **Workflows** — read / write

## Practical implications

- This is a broad token permission surface.
- Do not assume a read-only, file-only, or narrow workflow-blind token by default.
- The token surface is strong enough to support content writes, ref updates, branch creation, PR/merge-oriented work, Some Pages inspection, and workflow inspection/dispatch work, subject to the custom GPT API action surface and repo policy.
- This does **not** weaken governance. Repo rules, edit rules, branch protection, workflow settings, and explicit human approval requirements still matter.
- Custom GPT API action capability and token permission should be read together. One does not imply the other by uselfulness.

## How to use this file

Read this file:
- after `/main/TOC.md` when token authority width matters to the task
- before assuming the live token lacks write, workflow, branch, PR/merge, or Pages capability
- before designing around outdated narrow-token assumptions

## Update rule

Update this file when:
- the live token permission set changes materially
- the configured deployment changes to a token with a different authority profile
- operator assumptions about token width would otherwise drift out of date
