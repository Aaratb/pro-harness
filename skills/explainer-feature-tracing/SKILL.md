---
name: explainer-feature-tracing
description: "Map customer outcomes to source entry points, trace execution, isolate rule owners, explain functions, and render evidence-bounded sequences."
---

# Explainer Feature Tracing

Use in Phase 4 or for `feature-map`, `trace-feature`, `business-logic`, `explain-file`, `explain-function`, and `sequence`. Load Explainer Core and persisted prerequisites first.

## Selective references

Load only the references required by the requested capability:

- `references/entrypoint-signals.md`
- `references/business-rule-signals.md`
- `references/code-execution.md`
- `references/path-variants.md`

## Capability flow

1. `feature-map` discovers customer or caller actions breadth-first and connects each traceable action to a cited entry point and observable outcome. State static coverage and dynamic gaps.
2. `trace-feature` follows one selected action through calls, decisions, state or effects, and returns. Persist stable hop identifiers.
3. `business-logic` distinguishes decisions from transport, mapping, persistence, and wiring. Prove both the rule and any exclusivity claim.
4. `explain-file` establishes the file's responsibility and walks its important symbols in system context.
5. `explain-function` follows execution order through inputs, branches, effects, errors, and every exit. Persist stable exit identifiers.
6. `sequence` consumes verified hop and exit identifiers to show only paths supported by the declared scope and evidence.

Every output uses the four-layer teaching ramp, one running example, cited evidence, consequences, callbacks, and handoffs. A path found in only one representative branch is `a path`, never `the path`.

Carry the course's safe illustrative input through this path: show the relevant value or state before a decision, the rule that selects the branch, and the resulting value, state, or returned outcome. Derive the example from confirmed source, label its values illustrative, and never present a source walkthrough as an observed execution. Name the invariant and its actual decision or enforcement owner where evidenced; a transport wrapper or similarly named helper is not automatically the rule owner. Distinguish the initiating caller, the callee's return, a visible effect, durable commit, and any deferred continuation instead of collapsing them into "success." Use existing narrative and claim records, not a separate example ledger.

## Completion

The reader can predict where the action enters, where each important decision occurs, what state or effect changes, what returns next, and where to look when changing an already demonstrated rule.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
