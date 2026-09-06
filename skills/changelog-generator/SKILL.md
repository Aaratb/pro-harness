---
name: changelog-generator
description: "Generate user-appropriate changelog entries from verified diffs, commits, pull requests, and release evidence."
---

# Changelog Generator

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Determine audience, release boundary, repository changelog convention, and included revisions.
2. Group meaningful additions, changes, fixes, removals, migrations, and known limitations.
3. Exclude internal implementation noise and verify every claim against the diff or release artifacts.

## Output

Return or write the changelog entry to the repository-defined path or beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
