---
name: architecture-decision-records
description: "Capture durable architecture decisions with context, alternatives, consequences, uncertainty, falsifiers, and revisit conditions."
---

# Architecture Decision Records

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. State the decision context, constraints, owner, and decision date.
2. Describe viable alternatives and why they were rejected using evidence rather than preference.
3. Record consequences, risks, validity envelope, falsifiers, migration, rollback, and revisit triggers.

## Defend the architectural choice

Connect the decision to the business capability and the quality scenario it must satisfy. State the responsibility being placed, who owns the invariant, and why this boundary is appropriate. A module boundary need not be a service boundary. Prefer existing repository behavior or a small extension when it meets the constraints; a new abstraction needs a present consumer and an identifiable change or failure it contains.

Compare viable shapes against the same workload, constraints, evidence, and time horizon. Include delivery effort, operational ownership, and change cost—not only ideal steady-state performance. An option is not credible if it quietly drops the hard part of the problem. Explain why the strongest alternative loses and the conditions under which it would become preferable.

## Test decision robustness

Separate disqualifying constraints from preferences. Use approved weights and anchored scores when the calling workflow requires them, then test sensitivity to uncertain inputs and plausible weight ranges. Keep the approved baseline unchanged; any revised weights require approval. Show a rank reversal or explain why the choice is robust. Do not treat ordinal scores as physical measurements or a small weighted lead as proof.

For a close decision, identify the cheapest discriminating evidence and whether delaying the decision or choosing a reversible baseline is safer. For example, a worker queue may become justified by measured burst duration and required completion latency, not a hypothetical future traffic multiplier. Record modeled inputs as modeled; never claim the queue was tested by drawing it.

Preserve the fresh challenger's strongest counterexample, the author's response, any revision, unresolved dissent, and user-owned trade-off. Record the selected design's validity envelope and a concrete revisit signal with an owner, rather than promising it is future-proof. Reuse this reasoning in the decision memo and handoff; do not create another report for the same decision.

## Output

Write the ADR beneath `artifact_root` using the repository's established format when one exists.

When called as a static Architecture Pro lane, return the decision reasoning in the supplied report contract; the orchestrator owns persistence. This skill does not authorize repository changes, benchmarks, network calls, or deployment.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
