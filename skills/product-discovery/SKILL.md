---
name: product-discovery
description: "Interrogate a product opportunity and produce evidence-grounded requirements before solution design begins."
---

# Product Discovery

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `user-personas` only when this workflow reaches the step that needs it.
- Load `customer-journey-map` only when this workflow reaches the step that needs it.

## Workflow

1. Establish the user, problem, current workaround, desired outcome, constraints, and decision owner.
2. Require at least one repository or stakeholder evidence item for claims about current behavior.
3. Separate confirmed requirements, assumptions, open questions, non-goals, and measurable success.

## Decision quality

Treat the request as a hypothesis about a problem, not proof that the named feature is needed. Use the strongest available evidence: observed behavior and workarounds, then stakeholder reports, then assumptions. A signup, compliment, or approval is not demonstrated use or willingness to change behavior. Do not invent research or require revenue evidence for an internal tool.

Locate the actual bottleneck in the user's journey. Contrast the proposed intervention with doing nothing, improving an existing workflow, or solving an upstream cause. Name the evidence that could make your recommendation wrong and the cheapest useful next test. Ask only for a missing decision that would change direction; use already supplied answers.

Tie success to the user's outcome and a counter-metric, with a baseline/owner where known. Mark unknowns rather than filling the template with plausible targets. Deliver a point of view: what to do now, what to exclude, and what evidence would justify expanding.

Example of reasoning, not a prescribed solution: requests for a faster report may mask difficulty deciding what action to take. Measure decision delay before assuming report-generation speed is the problem. A useful brief can recommend less software.

## Output

Write an evidence-backed discovery brief beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
