---
name: plan-product-review
description: "Review a plan for user value, scope discipline, strategic coherence, success measures, and unnecessary product complexity."
---

# Plan Product Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Restate the user outcome and the smallest valuable scope.
2. Challenge weak demand evidence, vanity requirements, premature generalization, and missing counter-metrics.
3. Classify decisions as mechanical, reversible, strategic, or user-owned.

## Adversarial product judgment

Start by testing the causal claim: why should this intervention change the desired user outcome? Identify the weakest link between problem evidence, chosen audience, proposed behavior change, and measurement. Compare the strongest competing explanation and a status-quo/reuse option fairly; do not manufacture inferior alternatives to make the proposal win.

Prioritize objections by whether they change the decision. Challenge vanity adoption metrics, unsupported market sizing, scope added only for symmetry, and a business goal replaced by an easier proxy. An approval establishes intent, not validation. Preserve the user's explicit direction while surfacing evidence-backed reasons to reconsider.

Recommend material scope cuts and identify decision-changing unknowns with proportionate ways to resolve them. If none are supported, say so; do not manufacture objections or questions. For example, more notifications may raise clicks while worsening interruptions; the relevant test is whether the intended work completes with fewer missed obligations, not whether notifications are opened. Keep findings in the existing PRD/review, with evidence, consequence, and disposition—not another questionnaire.

## Output

Return product-plan findings, recommended scope changes, and decisions requiring the user.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
