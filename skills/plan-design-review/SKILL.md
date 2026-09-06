---
name: plan-design-review
description: "Review a design plan for usability, fidelity to approved direction, visual judgment, state completeness, accessibility, and responsive behavior."
---

# Plan Design Review

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `design-system` only when this workflow reaches the step that needs it.

## Workflow

1. Map planned user flows and all loading, empty, error, permission, success, and recovery states.
2. Inspect supplied visual references and representative rendered work when accessible; check accessibility, responsive behavior, copy, hierarchy, and component reuse against the approved direction.
3. Identify design decisions that must be resolved before implementation.

## Review through the user's attention

Walk the primary task from arrival through completion and recovery. What is noticed first? Is the next action recognizable without explanation? What context must be remembered between screens? Is the user's location, selected item, progress, and escape route clear? Consider frequent, first-time, keyboard, and constrained-viewport use only where relevant.

Separate usability, fidelity to the approved direction, and taste/art-direction judgments. A usable screen can miss its approved composition; a faithful implementation can reveal a weak direction; accessibility compliance does not automatically pass either fidelity or taste. Judge visual character against product purpose, real content, and inspected references, not an assumed house style. Do not bless the current implementation as its own approved baseline.

Tie each finding to a specific rendered element or planned decision, the observed mismatch or consequence, and an actionable correction. “Feels generic” needs a diagnosis such as equal visual weight hiding the primary action, typography erasing hierarchy, or inconsistent density breaking rhythm. Say what to change and what to preserve; distinguish a material issue from a subjective preference. Do not replace a coherent design merely to impose your preferred style.

Inspect actual rendered states before claiming visual quality, responsiveness, or accessibility passed. For a new visual language or material redesign, require an inspected representative screen before recommending propagation; compare it with the supplied approved reference and defining decisions. Inaccessible references and unavailable rendering remain explicit unverified limits, not visual passes. Static inspection can identify likely problems but cannot prove a click, focus transition, dialog exit, or async update works. Watch for refresh stealing focus, shifting targets, truncation hiding critical information, and failure copy that leaves no next action. Preserve authentication and permission boundaries throughout.

Example: a success toast is not enough if the item disappears and the user cannot locate or undo the change. Recommend the smallest correction that preserves orientation. Preserve brand constraints and accessible behavior while sharpening composition and character.

## Output

Return design-plan findings, missing states, and required amendments, keeping usability, fidelity, and taste judgments distinguishable and naming the evidence and unverified limits for each.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
