---
name: architecture-distributed-consistency
description: "Design consistency, partition, latency, conflict, and reconciliation behavior per invariant or operation rather than by global labels."
---

# Architecture Distributed Consistency

Apply when replicated state, multiple writers, asynchronous messaging, cross-service workflows, offline writes, caches as authorities, or multi-region behavior is material.

For each invariant or operation record:

- authoritative source and writers;
- transaction and partition boundary;
- normal-path consistency and latency choice;
- partition behavior and user-visible result;
- bounded staleness or loss;
- ordering, idempotency, deduplication, and conflict rule;
- reconciliation and recovery;
- observability, owner, evidence, and rollback.

Use ACID, isolation, linearizability, session guarantees, CAP, or PACELC only where they actually apply. A business trade between unavailability and inconsistency requires explicit approval. Return the ledger beneath the caller-supplied `artifact_root`.
