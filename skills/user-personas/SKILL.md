---
name: user-personas
description: "Create lightweight evidence-based personas for product decisions without inventing demographic or behavioral certainty."
---

# User Personas

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify meaningful behavioral segments from supplied evidence.
2. Describe goals, context, constraints, workflows, and decision-relevant differences.
3. Mark hypotheses and missing research rather than presenting fictional users as facts.

## Output

Return concise personas tied to evidence and product decisions.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
