# Phase 5 — System Views

Show the cross-cutting structures that are difficult to understand from a linear trace.

## Required work

1. Render the dependency graph and explain high fan-in, fan-out, cycles, and reverse dependents without treating correlation as quality judgment.
2. Reconstruct relevant entities, fields, relationships, ownership, and persistence boundaries from schemas and actual readers and writers.
3. Derive state transitions only from code that performs a write or from an authoritative checked-in contract. Record triggers and guards.
4. Classify each selected trace hop as blocking, deferred, scheduled, event-driven, worker-consumed, or unknown based on the actual mechanism.
5. Confirm retries, timing, acknowledgement, and failure behavior from repository configuration or approved authoritative documentation. Otherwise keep them inferred.
6. Mark data/state views out of scope when the target genuinely has no relevant persistent or client-state model.

Reconcile these views with the already-taught trace: the same identifier, state owner and completion boundary must mean the same thing everywhere. Async syntax alone does not establish deferred work; distinguish acceptance, persistence, completion and acknowledgement. Unknown provider behavior stays unknown rather than filling a diagram with assumed guarantees.

## Artifacts

- `sections/dependencies.json`
- `sections/data-model.json`
- `sections/state-model.json`
- `sections/execution-timing.json`
- diagram sources and rendered local assets

## Gate

Reverse-dependency completeness requires exhaustive scoped search. Async classification requires a cited mechanism. A fresh pass attempts counterexamples and checks that no diagram invents an edge or transition.
