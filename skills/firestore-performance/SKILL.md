---
name: firestore-performance
description: "Review or design Firestore document, index, query, hotspot, transaction, and cost behavior using repository evidence."
---

# Firestore Performance

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Identify read, write, transaction, document-growth, and tenancy patterns.
2. Evaluate document IDs, indexes, fan-out, hotspotting, query limits, and cost implications.
3. Define measurement and migration evidence rather than assuming production scale.

## Output

Return Firestore findings or design decisions with verification targets.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
