# Phase 3 — Shape

Explain the system's existing architecture without forcing a familiar stack pattern onto it.

## Required work

1. Detect the repository archetype per relevant package or traced action: backend service, frontend, mobile, CLI, pipeline, ML, infrastructure, library, worker, or mixed workspace.
2. Keep the architecture label `INFERRED` unless the repository names it. Confirm each role-to-file-to-symbol mapping independently.
3. Explain the architecture through orientation, mechanism, evidence, and consequence. Teach vocabulary at first use.
4. Produce a system/component view, a static module or type view, and one representative sequence view using real repository names and one running example.
5. Seed the conventions registry only with patterns needed to navigate the later trace.
6. Ask `system-architect` for a reconstruction-only second opinion only when the shape remains materially ambiguous.

Use the `explainer-architecture` method for the reconstruction. If `architecture-explanation-diagrams` is useful, load only its descriptive view-building guidance under Explainer Core, not design-option scoring or recommendations. Keep the same actors and running example across the views and distinguish declared intent from implemented responsibilities.

## Artifacts

- `sections/architecture-brief.json`
- architecture diagram sources and rendered local assets
- updated `registry.json` and `claims.json`

## Gate

Every diagram edge is a claim. A fresh pass checks boundaries, associations, calls, and labels. Missing renderers produce labeled source, not invented visuals. The phase passes when the reader can point from each architectural responsibility to the real code that performs it.
