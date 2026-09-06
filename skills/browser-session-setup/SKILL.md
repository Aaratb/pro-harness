---
name: browser-session-setup
description: "Prepare an approved browser automation session, authentication state, cookies, and profile without exposing credentials."
---

# Browser Session Setup

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.


## Required capabilities

- `browser.automate`

## Workflow

1. Confirm the target origin, authentication requirement, approved browser profile, and credential source.
2. Use existing authenticated state or an explicit user-completed login flow; never print secrets or cookie values.
3. Verify the session only against the approved origin and report expiration or access blockers.

## Output

Return session readiness and the approved origin without credential material.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
