# Phase 8 — Targeted Instrumentation

Read the causal-experiments and evidence references only if instrumentation is needed. Skip with a short reason when existing evidence distinguishes the cause.

Propose one question, affected files, safe target, capture/redaction method and teardown before authorized temporary edits. Reuse a cited repository logger/span/counter idiom. Tag temporary additions `[DEBUG-<runid>]`, keep their diffs separate from permanent repair, and preserve pre-existing edits.

Bound instrumentation to two rounds; stop when no named question is answered. Compare measured reproduction behavior before/after. If logging changes it, record `HEISENBUG-SUSPECTED`, stop log-statement probes and choose a timing-neutral method.

Gate: the probe answered its question or yielded an explicit limit. No temporary instrumentation becomes the permanent correction without passing Phase 11.
