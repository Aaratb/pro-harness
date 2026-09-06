# Phase 4 — Evidence & Reproduction Recipe

Use the evidence reference for signal limits and admissibility. Separate observed, source-derived, modeled, pasted, stale, and unavailable evidence. Exclude inadmissible artifacts from reasoning rather than attaching a caveat to an unsupported claim.

State the exact signature and a repeatable recipe: input/fixture, prerequisites, environment, command or steps, expected result, actual result, assertion and safety bounds. Cite evidence or mark a field `UNKNOWN`.

Do not infer rates from logs, per-entity behavior from fleet metrics, prevalence from sampled traces, or absence without a matching positive control. A deterministic static check's output can be its own static signature; it does not prove runtime behavior.

Gate: the recipe targets the reported defect, and evidence can support the intended claim.
