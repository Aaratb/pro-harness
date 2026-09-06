---
name: explainer-system-views
description: "Explain module dependencies, reverse dependents, data relationships, lifecycle transitions, and synchronous or deferred execution from source evidence."
---

# Explainer System Views

Use in Phase 5 or for `dependency-graph`, `data-model`, and `sync-async`. Load Explainer Core and the relevant trace artifacts first.

## Selective references

- `references/dependency-resolution.md`
- `references/data-and-state.md`
- `references/execution-timing.md`

## Dependency view

Consume the intake dependency substrate. Confirm forward edges at import or configuration sites. Claim complete reverse dependents only after exhaustive scoped search. Explain cycles and fan-in as structure, not as defects.

## Data and state view

Find schemas, migrations, types, validators, serializers, stores, and actual readers and writers. Derive cardinality and ownership from authoritative definitions. Derive transitions from code that performs the write and capture the trigger and guard. When persistence or client state is not relevant, mark the view out of scope with evidence.

Keep this view aligned with the selected trace and running example: distinguish the input shape, any in-memory change, the actual writer, and the persistence or visibility boundary. A type, validator, or migration declares something at its own boundary; its existence alone does not prove every runtime path enforces it. Explain the relevant invariant and who enforces it, marking external enforcement or deployment state unknown when unavailable.

Use `data-model-architect` only under a reconstruction-only lane contract when relationships remain materially ambiguous. Ignore its design and migration behavior for this workflow.

## Execution timing view

Classify each selected hop from the actual mechanism: awaited/blocking, returned promise, callback, event publication, queue, scheduler, worker, process, or unknown. Retry, timeout, acknowledgement, and failure claims require repository configuration or approved current documentation.

Do not equate an `async` keyword with background work. An awaited asynchronous operation can finish before the awaiting caller's operation completes without blocking a thread; distinguish that completion from the immediate return of a promise. Follow the caller's completion contract and separate accepted, persisted, completed, and acknowledged; an enqueue response is not proof the consumer finished. Align this timing account with the same path's sequence and state transitions, and retain unknown boundaries rather than inventing ordering or external guarantees.

## Completion

The reader can identify upstream and downstream modules, explain the relevant data shape and lifecycle, and predict which work completes before the entry point returns.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
