---
name: score-change-risk
description: "Score change risk from blast radius, data flow, production impact, reversibility, verification quality, and operational readiness."
---

# Score Change Risk

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify affected users, systems, data, contracts, environments, and irreversible operations.
2. Score likelihood, impact, detectability, reversibility, and evidence quality using stated anchors.
3. Expose assumptions and sensitivity instead of presenting an unexplained aggregate score.

## Output

Return the risk ledger, blockers, score inputs, and ranked mitigations.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
