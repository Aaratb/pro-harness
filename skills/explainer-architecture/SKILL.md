---
name: explainer-architecture
description: "Explain an existing repository architecture in plain language and map its actual responsibilities to evidence-backed components and diagrams."
---

# Explainer Architecture

Use in Phase 3 or for the `architecture` capability. Load Explainer Core and the persisted repository atlas first.

## Selective reference

Read `references/architecture-recognition.md` before naming a system shape.

## Workflow

1. Detect the archetype per relevant package or action from manifests, entry points, folder structure, framework wiring, and dependency direction.
2. Explain the dominant shape in plain language before introducing its conventional name.
3. Separate declared architecture from implemented structure: a document proves what was declared, while imports, wiring, calls, and writers establish what this path actually does. Keep the pattern name inferred unless the repository explicitly declares it and the implementation supports it. Confirm each responsibility-to-file-to-symbol row; do not fit code into a preferred label or grade deviations.
4. Mark responsibilities the repository does not use as absent rather than assigning the nearest file.
5. Produce component, static module/type, and representative sequence views using real names and the course's one running example. Connect each material box or arrow to its implementing symbol, caller, or configuration; follow the same action and values across views rather than illustrating different systems.
6. Add only navigation-relevant naming and layering patterns to the conventions primer.
7. Use `system-architect` as a reconstruction-only second opinion only when competing shapes remain plausible.

Explain boundary consequences where source supports them: who may make a decision or write state, what another component must call or await, and which dependency or failure can affect the caller. Distinguish a documented rationale from an inferred trade-off; code can establish a consequence without proving why its author chose it. Describe the current arrangement, not a preferred replacement.

## Completion

The reader can explain the system boundary, name each material responsibility in plain language, point to the real implementation, and trace one representative interaction without relying on an invented stack template.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
