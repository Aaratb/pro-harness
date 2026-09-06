---
name: create-prd
description: "Turn approved discovery into a repository-local product requirements document with measurable acceptance criteria."
---

# Create Prd

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `write-user-stories` only when this workflow reaches the step that needs it.
- Load `user-personas` only when this workflow reaches the step that needs it.

## Workflow

1. Consume approved discovery rather than restarting ideation.
2. Define goal, users, scope, non-goals, requirements, metrics, constraints, dependencies, and risks.
3. Trace acceptance criteria to requirements and label every unresolved assumption.

## Decision quality

The PRD is a decision contract, not a completed template. Preserve the approved business problem, affected users, and why the chosen intervention should change their behavior or outcome. Separate observed evidence, stakeholder decisions, and hypotheses; do not invent interviews, baselines, targets, or market demand. An unknown should have a consequence and a way to resolve it, not a polished placeholder.

Describe the user's current workaround and the smallest valuable end-to-end journey. Include prerequisites, alternate paths, recovery, and affected users who cannot take the happy path. Respect explicit prototype constraints; production capabilities are not implicitly authorized. Explain important exclusions and dependencies that could defeat the promised value.

Make each important requirement falsifiable: actor and precondition, action, observable result, and the unacceptable outcome. Distinguish user outcomes from implementation choices. For example, “the recipient can accept ownership, and unaccepted work remains visible” is testable; “add an assignment button” does not establish successful handoff.

Choose outcome measures with a denominator, observation window, and guardrail where known. Explain confounders and what evidence would cause a scope change or cancellation. Keep requirement-to-acceptance links within the existing PRD; do not create a second tracking system. Resolve material product ambiguities with the user, not by quietly choosing an architecture.

## Output

Write `prd.md` beneath `artifact_root` or the caller-specified filename inside that root.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
