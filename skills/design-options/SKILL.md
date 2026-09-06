---
name: design-options
description: "Develop product-grounded visual and interaction directions from approved requirements, and compare representative options where they resolve a material choice."
---

# Design Options

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `design-system` only when this workflow reaches the step that needs it.

## Workflow

1. Load approved requirements, user journeys, real product content, repository design conventions, supplied visual references, and accessibility constraints.
2. Establish a coherent art direction and use meaningfully different representative options to resolve material visual or interaction choices, with relevant states, responsive behavior, and trade-offs.
3. Recommend a direction using explicit criteria and record the inspected evidence, defining decisions, and rejected alternatives in the existing design artifacts.

## Design taste and meaningful alternatives

Start with the user's work, attention, context, and desired feeling. Inspect the existing interface and accessible references; do not invent reference observations or claim to have seen inaccessible material. Identify useful choices in composition, typography, density, imagery, and interaction, why they fit this product, and what not to borrow. Reuse an established direction when it demonstrably serves the product; a weak current screen is not an approved direction merely because it exists. Missing reference access stays explicit and does not authorize external browsing or data transfer.

Make a coherent hierarchy: what must be noticed first, understood next, and acted on. Ground it in actual product labels, data shapes, actions, and content lengths; use safe representative substitutes where private data cannot be used. Choose visual decisions because they support that hierarchy and product character. Taste is a reasoned judgment, not a universal font, palette, layout, or novelty quota.

Options should expose consequential differences in composition, typographic hierarchy, density, imagery, information priority, navigation, or interaction—not merely recolor the same cards. Compare repeat-use efficiency with first-use comprehension. Treat factual signals and uncertain recommendations differently so visual confidence does not imply unwarranted authority. Decide what to remove or quiet as deliberately as what to emphasize.

For a new visual language or material redesign, render and inspect a representative screen before scaling it across the app. Render alternatives only where seeing the difference helps settle a material choice; there is no option quota or full-app prototype requirement. Include enough real content and relevant states to expose hierarchy and layout: a long label, empty/error/recovery, keyboard focus, and a narrow-screen transition when relevant. Preserve authentication, permissions, and accessibility behavior in each direction. If rendering is unavailable, record the visual direction as unverified and return that limit to the coordinator; prose, markup, a wireframe, or tokens alone cannot earn a visual pass.

Example: for a high-frequency operational surface, oversized summary cards may displace the work. A compact queue and a focused case view are different interaction choices; “blue versus purple” is not. Recommend one direction with a concrete trade-off and reject the strongest alternative fairly. Distinctiveness should serve the product, not decorate it.

## Output

Write design options and the decision memo beneath `artifact_root`. Keep the selected rendered reference and its location, defining composition/type/density/imagery/interaction decisions, content assumptions, and any unverified claims together so fresh implementation workers can inspect and carry the same direction forward.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
