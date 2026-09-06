---
name: architecture-edge-case-economics
description: "Prioritize credible architecture edge cases using risk scoring, explicit complexity budgets, and a defensible stopping rule."
---

# Architecture Edge-Case Economics

Use this skill to decide which failure scenarios deserve architecture complexity.

1. Define probability, impact, and detectability anchors before scoring.
2. Score credible scenarios consistently and show the evidence or modeled assumptions.
3. Classify scenarios as must-address, mitigate-if-cheap, accept, or unverified.
4. Prefer shared low-cost controls over one-off machinery.
5. Track complexity spent across components, state, operations, migration, and cognitive load.
6. Stop when the next control costs more than its bounded risk reduction, unless a hard constraint requires it.

Material accepted risk requires an owner, expiry or revisit condition, detection path, and explicit approval. Keep the ledger beneath the caller-supplied `artifact_root`.
