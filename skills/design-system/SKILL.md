---
name: design-system
description: "Inspect, extend, or audit a repository design system using existing tokens, components, interaction states, and accessibility rules."
---

# Design System

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Workflow

1. Detect existing tokens, components, typography, spacing, themes, icons, and accessibility conventions; for visual work, load and inspect the approved visual artifacts and defining decisions when accessible.
2. Prefer reuse and extension over parallel components or new literals, while checking that the existing system supports the approved direction.
3. Document missing states, inconsistencies, and any proposed token or component addition.

## Decision quality

A design system should express a coherent product character and help users act, not merely remove hardcoded values. Read the existing interface with actual product content or safe representative substitutes: what is noticed first, how dense it needs to be, what conveys urgency, and which actions deserve emphasis. Preserve familiar patterns that work; do not treat an unexamined or weak baseline as approved art direction. Explain whether a proposed change improves behavior, accessibility, or aesthetic coherence.

Prefer semantic roles over isolated values. Define how typography, spacing, surfaces, borders, color, imagery, and motion cooperate across a screen. Use the approved direction, brand, and platform conventions; do not prescribe extra fonts, arbitrary palette sizes, trendy layouts, or a decorative signature for every product. For a new visual language or material redesign, inspect a representative rendered composition before broad token/component propagation. Compare the implemented screen with the supplied approved reference and defining decisions; correct material drift before scaling. If material direction is missing or contradictory, return it to the coordinator instead of silently inventing a replacement. If rendering is unavailable, state what remains visually unverified.

For a changed component, inspect relevant interactive and content states: keyboard focus, disabled versus unavailable, validation, loading, empty, destructive confirmation, long labels, narrow screens, and theme contrast. Preserve authentication and permission behavior. Do not infer accessibility or responsive success from token names, or aesthetic quality from accessibility compliance. Distinguish measured/rendered findings from predictions.

Introduce a shared abstraction only when a repeated need or stable variation supports it. Keep exceptions intentional and local; avoid a second component system to solve one screen. Explain the smallest extension, its affected consumers, and how the change will be verified.

## Output

Return a design-system decision or audit with exact repository evidence.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
