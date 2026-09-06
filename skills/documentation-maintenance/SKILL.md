---
name: documentation-maintenance
description: "Generate or update technical documentation from verified implementation and tests using repository-native locations and structures."
---

# Documentation Maintenance

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `architecture-decision-records` only when this workflow reaches the step that needs it.

## Workflow

1. Select `generate` for a missing documented surface or `update` for behavior changed by the active diff.
2. Read implementation and tests before writing conceptual, how-to, tutorial, or reference material.
3. Check links, examples, diagrams, version claims, and drift against current source.

## Output

Write documentation only to repository-defined paths or beneath `artifact_root`, then return changed paths and evidence.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
