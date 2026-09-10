---
name: architecture-data-model-evolution
description: "Design and audit data models, integrity placement, compatibility, lifecycle behavior, and safe expand-contract evolution."
---

# Architecture Data-Model Evolution

1. Inventory entities, invariants, relationships, writers, readers, access patterns, tenant boundaries, event schemas, retention, and deletion paths.
2. Evaluate normalization against observed access patterns and reconciliation ownership; do not justify denormalization by intuition.
3. Place integrity where every writer is constrained and identify application-only invariants that can drift.
4. Treat persisted and event schemas as versioned contracts with a producer and consumer census.
5. Sequence changes as expand, migrate, verify, then contract; preserve rollback compatibility through the agreed window.
6. Model hot-table, index-write, backfill, locking, and lifecycle risks using a detected datastore overlay only when applicable.

## Prove the invariant through change

Choose the material business invariant and trace its lifecycle: who may create or change the state, which component owns enforcement, what every writer can bypass, and which readers or consumers rely on it. Walk the normal operation and a credible concurrent or partially completed operation. Identify the durable decision point, competing writes, retry identity, and reconciliation owner; separate transport acceptance from committed state and completed business effect.

For example, two requests can both read the last available unit and each approve a reservation. A prior availability check does not establish the invariant. Explain the atomic enforcement or serialization boundary, the losing request's outcome, and how a timeout after commit is resolved without reserving twice. Specify the exact assertion that would disprove the proposed control rather than prescribing a datastore absent evidence.

Carry that invariant across expand, migrate, verify, and contract. Show what old and new writers emit, what old and new readers accept, and how a backfill racing with live updates avoids lost changes. Define progress and restart behavior for partial backfills, reconciliation for divergent representations, and the evidence needed before removing compatibility. A completed migration job does not prove every consumer has moved.

Name the rollback boundary: after destructive transformation or incompatible writes, rolling back code may not restore data semantics. Distinguish reversible rollout, compensating repair, and restore/replay; state which data and versions each preserves. Return the decisive example and checks in the existing model or migration section, not a separate artifact per concern. Remain static-only: specify checks and migrations without executing them.

Keep runtime behavior unverified without measurements. Return the model decision, evolution sequence, rollback, and fitness checks beneath the caller-supplied `artifact_root`.

## The schema plan, and where the line falls

Architecture Pro produces `data-model/schema-plan.md` beneath `artifact_root`. It is a plan.
It contains no DDL, no migration file, and no index statement.

Cover: entities and their ownership; the integrity rules that must hold through the change;
the compatibility window for every consumer of the data; and the migration strategy —
expand/contract or dual-write, backfill shape, and how a partially-migrated state behaves.
Name what would make the migration unsafe to run twice.

Feature Pro details this into entities, fields and indexes, then `database-engineer` writes
the actual migrations against it. That split is enforced by capability, not by convention:
`data-model-architect` has no repository write access, so a plan cannot silently become an
implementation.

State explicitly which entities are exposed to other services. A schema another team reads is
a contract in everything but name, and changing it needs the same compatibility discipline as
an API.
