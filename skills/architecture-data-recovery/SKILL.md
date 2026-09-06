---
name: architecture-data-recovery
description: "Audit backup, restore, replay, reconciliation, and disaster recovery against dependency-aware recovery objectives."
---

# Architecture Data Recovery

Inventory authoritative stores, replicas, queues, caches, object storage, schemas, keys, configuration, and external dependencies needed to restore service.

Define recovery point and recovery time objectives per business capability. Build a dependency-ordered restore graph covering schema compatibility, identity and key access, replay boundaries, duplication, ordering, reconciliation, verification, rollback, and ownership.

## Recover the business capability, not just the database

Choose a credible loss or corruption scenario and establish the last trusted state, authoritative recovery inputs, and dependencies needed to use them. Include access to keys and identities, compatible software and configuration, and external side effects that cannot be rolled back by restoring a store. A replica or successful backup job may faithfully preserve the same corruption.

Model recovery time against the agreed clock start and service-acceptance condition. Account for detection and decision time where that clock includes them, then the critical path through access restoration, data recovery, replay, reconciliation, and business verification. Sum sequential steps, take the longest dependency path for parallel work, and do not double-count overlapping windows. Label durations and throughput as measured or modeled with assumptions and sensitivity; restore time alone is not end-to-end recovery time.

Assess recovery point against the latest trusted business state that can actually be reconstructed at the agreed incident boundary. Explain which acknowledged changes may be lost and whether replay can recover them. Backup age, replication lag, detection delay, and replay coverage are related evidence, not numbers to add blindly. Corruption discovered late may move the last clean point outside the nominal backup interval.

Specify business-level verification: preserved invariants, tenant isolation, duplicate or missing effects, reconciled external state, and readiness of downstream consumers. For example, restoring orders does not undo payments already accepted externally; replay must distinguish an unprocessed order from a completed payment whose local acknowledgement was lost. State the owner and safe next action for unresolved cases.

Distinguish configured backup from successful restore evidence. A backup schedule does not prove restorability, completeness, timing, or application consistency. Require a bounded drill or equivalent evidence for certification of an operational recovery claim; preserve all measurements required by the governing certification gate.

For a new design, provide a modeled recovery specification and the future acceptance proof; do not represent an unbuilt recovery path as exercised. Operational readiness claims require representative restore evidence, including business checks and timing, within the applicable certification gate. This skill specifies the drill, data scope, stop conditions, and rollback only; it does not execute restoration, replay, or live probes.

Return the recovery graph, evidence gaps, drill specification, and residual risk beneath the caller-supplied `artifact_root`.
