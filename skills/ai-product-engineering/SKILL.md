---
name: ai-product-engineering
description: "Design and deliver AI or LLM product features across product fit, model and prompt contracts, tools, grounding, evaluations, safety, privacy, cost, latency, fallback, observability, and release monitoring. Use when a feature calls models, embeds or retrieves content, uses agents/tools, changes system prompts, or makes probabilistic behavior user-visible."
---

# AI Product Engineering

Use the caller-supplied `artifact_root`. Activate only when repository evidence or the approved feature scope contains an AI/ML/LLM, embedding, retrieval, prompt, agent, model, or tool-calling surface.

## Progressive references

- Read `references/product-and-system.md` during requirements, product definition, planning, and impact mapping.
- Read `references/evaluation-and-release.md` while defining tests, evaluation gates, rollout, and monitoring.
- Read `references/security-and-harness.md` for prompts, retrieval, tools, external models, sensitive data, or autonomous actions.

## Workflow

1. Prove why probabilistic behavior is appropriate and define the non-AI baseline or fallback.
2. Freeze user outcome, unacceptable failures, quality dimensions, and measurable release thresholds before selecting implementation details.
3. Define versioned model, system-prompt, context, retrieval, tool, input, output, and refusal contracts.
4. Design deterministic tests and statistical evaluations separately. Include representative, boundary, adversarial, multilingual, and regression cases as applicable.
5. Bound autonomy, data exposure, cost, latency, retries, and failure behavior. Require confirmation for consequential external actions.
6. Instrument model, prompt, retrieval, tool, safety, cost, latency, and fallback outcomes without recording protected content by default.
7. Release behind an appropriate cohort or flag; compare against the frozen baseline and stop or roll back when a threshold is crossed.

## Output

Write or review an AI delivery section containing the product hypothesis, versioned contracts, evaluation plan and dataset provenance, security boundaries, cost/latency budget, fallback, observability, rollout, and rollback conditions.

## Stop conditions

- Stop before implementation when quality thresholds, data authority, tool permissions, or fallback behavior are unresolved.
- Stop before release when evaluation evidence is stale, statistically inadequate, contaminated, or below an approved threshold.
- Never expose chain-of-thought as an observability or debugging mechanism.
