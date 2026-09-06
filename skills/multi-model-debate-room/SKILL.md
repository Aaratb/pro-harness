---
name: multi-model-debate-room
description: "Run a structured multi-perspective debate when a small number of materially different options remain genuinely contested."
---

# Multi Model Debate Room

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. State the contested decision, evidence packet, constraints, and decision criteria.
2. Assign distinct perspectives and run bounded argument, rebuttal, and synthesis rounds without inventing new facts.
3. Resolve or narrow the disagreement and preserve dissent, uncertainty, and the decision owner.

## Output

Return a decision record with arguments, evidence, verdict, confidence, and unresolved dissent.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
