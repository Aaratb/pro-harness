---
name: review-pull-request
description: "Review a pull request from its complete diff and repository context with actionable evidence-backed findings."
---

# Review Pull Request

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `pre-merge-review` only when this workflow reaches the step that needs it.

## Workflow

1. Resolve the exact repository, pull request, base, head, and current revision.
2. Inspect the complete diff, surrounding code, tests, checks, and instructions.
3. Report actionable findings with severity and evidence; post comments only when explicitly authorized.

## Output

Write the review report beneath `artifact_root` and return comment drafts or published links.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
