---
name: prepare-change-for-review
description: "Prepare a completed change for review by checking scope, tests, documentation, changelog, branch state, and pull-request readiness."
---

# Prepare Change For Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `verification-before-completion` only when this workflow reaches the step that needs it.
- Load `create-pull-request` only when this workflow reaches the step that needs it.

## Workflow

1. Inspect the final diff, branch, commits, generated files, tests, documentation, and release notes.
2. Repair only authorized mechanical issues and rerun required proof.
3. Prepare or create the pull request after slice and outward-action gates are satisfied.

## Output

Write the review-preparation report beneath `artifact_root` and return the pull-request handoff.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
