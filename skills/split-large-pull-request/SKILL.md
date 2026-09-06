---
name: split-large-pull-request
description: "Split an oversized change into dependency-ordered reviewable pull requests with preserved behavior and explicit stacking."
---

# Split Large Pull Request

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `incremental-delivery` only when this workflow reaches the step that needs it.

## Workflow

1. Map changed files, interfaces, imports, migrations, tests, and dependency edges.
2. Partition at reviewer boundaries into independently coherent slices and identify compatibility bridges.
3. Define branch and base order, verification per slice, and safe recovery if a split fails.

## Output

Write the stacked pull-request plan beneath `artifact_root`; do not publish branches without explicit authority.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
