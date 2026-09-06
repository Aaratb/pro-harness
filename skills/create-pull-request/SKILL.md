---
name: create-pull-request
description: "Create or update a focused pull request with accurate scope, verification, risks, rollout, rollback, and reviewer guidance."
---

# Create Pull Request

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `verification-before-completion` only when this workflow reaches the step that needs it.

## Workflow

1. Confirm the branch, base, commit set, diff scope, repository instructions, and authorization to publish.
2. Draft a concise title and body from verified artifacts, including tests, risks, rollout, rollback, and review focus.
3. Create or update the pull request only with explicit outward-action authority and verify the resulting URL.

## Output

Return the pull-request URL and exact published metadata, or a ready-to-paste draft when publication is not authorized.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
