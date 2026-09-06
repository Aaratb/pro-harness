# Phase 6 — Reference

Turn evidence accumulated during the course into durable lookup material.

## Required work

1. Read each scoped local public symbol or wrapper and its relevant tests before describing how to use it. A skimmed signature is insufficient; this does not require exhaustive reading of external dependencies.
2. Build the library guide from manifests plus repository call sites. Distinguish why the repository uses a dependency from what current vendor documentation says it does.
3. Use approved Firecrawl documentation lookup only when local evidence cannot establish external behavior. Record URL, retrieval time, consent, and limitation.
4. Finalize conventions only from repeated examples. A single instance remains inferred.
5. Finalize the living glossary using the vocabulary already taught. Resolve duplicates and ambiguous terms without changing established names silently.
6. Keep recommendations descriptive: show how code in this repository is already written, not how the repository ought to be redesigned.

Explain actual reuse through local services, wrappers and shared functions before raw vendor calls. Distinguish an installed dependency from observed usage and a repeated convention from an enforced rule. Reference entries answer lookup questions and point back to the existing worked path instead of duplicating it.

## Artifacts

- `sections/libraries.json`
- `sections/conventions.json`
- `sections/glossary.json`
- finalized `registry.json`

## Gate

A fresh pass verifies public surfaces, tests, call sites, convention instance counts, and definitions. Vendor documentation can confirm vendor behavior but cannot certify repository usage.
