---
name: search-first
description: "Search for existing implementations, utilities, contracts, tests, and conventions before adding a new abstraction or dependency."
---

# Search First

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Search exact names, neighboring concepts, imports, exports, tests, configuration, and generated code.
2. Compare reuse, extension, and new implementation options against repository conventions.
3. Record the reuse decision and evidence before writing new code.

## Output

Return the search evidence and explicit reuse, extend, or create decision.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
