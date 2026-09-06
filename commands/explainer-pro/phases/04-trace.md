# Phase 4 — Trace

Connect customer-visible outcomes to concrete execution paths and explain the decisions made along them.

## Required work

1. Build a breadth-first feature outcome atlas from statically discoverable entry points. State coverage and dynamic-dispatch gaps.
2. Select one feature for a deep trace unless the user explicitly expands the path budget.
3. Trace each hop from customer or caller action through entry, decisions, state or effects, and observable outcome. Cite calls, branches, and returns.
4. Separate rule owners from transport, persistence, and wiring. Prove exclusivity before calling a file business-logic-only.
5. Walk the hot file or function in execution order, including inputs, branches, side effects, errors, and every terminal exit.
6. Produce a simple feature flow and a bounded sequence ledger covering evidenced success, denial, validation, failure, retry, and deferred paths that actually exist.
7. In change mode, intake the diff safely, explore surrounding code beyond the hunks, and explain prior behavior, core intuition, conceptual change groups, consequences, and comprehension checks. Intent remains inferred without commit, plan, or pull-request evidence.

Use the example to explain before/after state, rule ownership, returns and pending effects, then contrast one evidenced branch where it clarifies the mechanism. A hypothetical input is an illustration, not an execution claim. Reuse the surrounding model in change mode rather than reauthoring it, and preserve what the diff did not change.

## Artifacts

- `sections/feature-atlas.json`
- `sections/feature-trace.json`
- `sections/business-rules.json`
- `sections/code-execution.json`
- `sections/sequences.json`
- optional `sections/change-explanation.json`

## Gate

A fresh pass checks every material hop, rule owner, branch, exit, and diagram edge. `THE path` requires absence proof; otherwise say `a traced path`. Contradictions become severity-free suspected logic risks and do not turn into review findings.
