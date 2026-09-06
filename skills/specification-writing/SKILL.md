---
name: specification-writing
description: "Write precise technical or product specifications with explicit contracts, invariants, failure behavior, and testable acceptance criteria."
---

# Specification Writing

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. State the goal, scope, non-goals, assumptions, constraints, and owners.
2. Define interfaces, data shapes, behavior, failure modes, compatibility, and invariants.
3. Add measurable acceptance criteria and verification targets with no placeholders.

## Decision quality

Start from the approved product and architecture decisions. A spec must explain how those decisions become observable behavior, not reopen settled scope or smuggle in unapproved infrastructure. Identify existing services, functions, data owners, and contracts to reuse; justify exceptions with repository evidence. Scale detail to the risk, not a section count.

Walk an important operation from input through validation, authorization, state transition, side effects, and response. Name the invariant and the layer that enforces it. At material boundaries, define failure semantics, timeouts, duplicate or stale work, concurrency, and recovery. Say which results are durable and when they become visible. Avoid vague promises such as “handle errors gracefully” or “eventually consistent” without user-visible consequences.

Use concrete examples to disambiguate contracts, including a rejected request or competing update when relevant. State versioning and migration needs only where behavior or stored data actually changes. Tie each risky behavior to an observable assertion and the test level capable of proving it; identify what mocks cannot establish.

Unknown values must remain explicit decisions with owners or evidence needed, never fabricated certainty. Mark unresolved consequential choices as not build-ready. Keep diagrams and examples consistent with the same contract rather than maintaining parallel specifications.

## Output

Write or refine the requested specification beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
