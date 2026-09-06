---
name: write-user-stories
description: "Write user stories and acceptance criteria that describe observable value without prescribing hidden implementation details."
---

# Write User Stories

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify the actor, context, desired outcome, and value for each story.
2. Write testable acceptance criteria covering success, permissions, empty, error, and boundary states where applicable.
3. Remove duplicate stories and implementation-only language unless it is an explicit constraint.

## Output

Return stories and acceptance criteria ready to embed in the active product artifact.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
