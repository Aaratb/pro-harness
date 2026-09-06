---
name: stochastic-multi-agent-consensus
description: "Rank several independent options through bounded parallel scoring with explicit criteria, uncertainty, and disagreement reporting."
---

# Stochastic Multi Agent Consensus

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Define independent options, weighted criteria, evidence, and a fixed number of scoring passes.
2. Collect scores independently before synthesis to reduce anchoring.
3. Report the distribution, sensitivity to weights, consensus, and meaningful disagreement.

## Output

Return the ranked decision matrix and uncertainty summary.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
