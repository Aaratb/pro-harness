---
name: explainer-reference
description: "Build repository-specific library, convention, and glossary reference material from implementations, tests, manifests, and repeated evidence."
---

# Explainer Reference

Use in Phase 6 or for `libraries`, `conventions`, and `glossary`. Load Explainer Core and the living registry first.

## Selective references

- `references/library-analysis.md`
- `references/convention-evidence.md`
- `references/living-registry.md`

## Archaeology gate

Before documenting a scoped local public surface, read the complete relevant symbol or wrapper and its relevant tests, including called behavior needed to explain the contract. This is not a requirement to read every file of a repository or an external dependency. Capture purpose, concepts, public surface, dependencies, dependents, edge cases, and demonstrated design decisions. An unread local implementation stays inferred and cannot become a usage recommendation. For vendor internals or defaults, follow version/configuration evidence and consent-bound authoritative documentation; state what is unavailable.

## Outputs

- The library guide joins manifest declarations to real call sites and repository purpose. External documentation confirms only current vendor behavior and requires consent.
- The conventions guide covers naming, imports, errors, request and response shapes, configuration, constants, tests, and feature layout only where repeated evidence exists.
- The glossary finalizes terms already introduced, deduplicates definitions, preserves the established name, and marks ambiguity.

This phase describes how the repository currently works. It does not recommend redesign, assess quality, or label missing practices as defects.

Teach reuse at the actual local seam: a shared function, service or wrapper may supply validation, identity, retries, defaults or error mapping that a raw library call lacks. Show one existing caller and its demonstrated contract, plus relevant configuration and test limitations. An installed dependency may be unused in the inspected scope; declaration is not usage. Distinguish an example, a repeated convention, a declared rule and an enforced contract. Show exceptions rather than turning frequency into a universal policy.

Make reference entries answer a practical lookup question from the course. Explain similarly named concepts at their boundaries, and point back to the worked path instead of copying it into each entry. Descriptive examples are not authorization to execute them or a recommendation to replace working code.

## Completion

The reader can look up why a dependency is present, how a familiar change is shaped in this repository, and what each course term means at its defining source location.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
