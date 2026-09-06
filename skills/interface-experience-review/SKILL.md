---
name: interface-experience-review
description: "Review developer-facing interfaces for discoverability, consistency, error quality, compatibility, and time to first success."
---

# Interface Experience Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `api-and-interface-design` only when this workflow reaches the step that needs it.

## Workflow

1. Identify each API, CLI, SDK, configuration, or agent-facing interaction and its target user.
2. Estimate time to first success and inspect naming, defaults, examples, errors, migration, and backward compatibility.
3. Raise each friction point as an independent decision or acceptance checkpoint.

## Output

Return the interface-experience gap analysis and measurable improvements.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
