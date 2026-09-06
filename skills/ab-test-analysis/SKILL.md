---
name: ab-test-analysis
description: "Design or analyze an experiment using explicit hypotheses, guardrails, sample assumptions, and decision thresholds."
---

# Ab Test Analysis

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Define the hypothesis, primary metric, guardrails, unit of randomization, and exposure rules.
2. Check sample, duration, novelty, interference, peeking, and segmentation risks.
3. State the decision rule and distinguish observed effects from causal claims.

## Output

Return an experiment plan or analysis with assumptions, calculations, and decision status.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
