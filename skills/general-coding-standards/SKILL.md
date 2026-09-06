---
name: general-coding-standards
description: "Apply repository-native correctness and maintainability standards without imposing an unrelated language, framework, or style guide."
---

# General Coding Standards

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Read repository instructions, linters, formatters, compiler settings, and adjacent patterns.
2. Identify correctness or maintainability rules that are actually enforced or consistently established.
3. Report deviations with repository evidence and avoid preference-only findings.

## Output

Return applicable standards and evidence-backed deviations.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
