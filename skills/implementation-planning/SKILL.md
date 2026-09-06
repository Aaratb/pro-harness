---
name: implementation-planning
description: "Turn approved requirements and architecture into small dependency-ordered implementation slices with explicit verification and ownership."
---

# Implementation Planning

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `incremental-delivery` only when this workflow reaches the step that needs it.

## Workflow

1. Identify interfaces, files, dependencies, migrations, risks, and decisions that remain unresolved.
2. Slice work vertically in dependency order with disjoint parallel scopes where safe.
3. Give every slice a pre-change proof, implementation steps, verification command, rollback note, and completion evidence.

## Engineering judgment before task enumeration

Start from the approved architecture and the simplest viable change to the existing system. State which constraint justifies each new boundary, dependency, asynchronous step, or abstraction; remove additions justified only by hypothetical scale. Preserve a clear extension seam where evidence warrants it, without implementing future infrastructure now.

Trace a representative request or interaction from input through branching, state changes, side effects, and the observable outcome. Assign ownership of invariants at the boundary that can enforce them. Where applicable, account for stale work, duplicate delivery, partial failure, ordering, and user intervention. Do not turn every local prototype into a distributed-system exercise.

Make each slice deliver a testable end-to-end behavior with explicit inputs/outputs and a safe failure state. Choose the test level by what a mock would conceal. Name the assertion, not merely “add tests”; name what rollback must restore, not merely “revert.”

Example: adding an asynchronous export needs a clear completion/failure contract and duplicate-request behavior, not automatically a new service. The first slice should demonstrate one export reaching a truthful user-visible state before expanding formats or optimizing throughput. Surface unresolved product/architecture choices rather than burying them in implementation assumptions.

## Output

Write `spec.md` and `tasks.md` beneath `artifact_root` when requested by the caller.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
