---
name: browser-exploration
description: "Explore an approved web surface quickly to understand navigation, states, controls, and likely test paths before systematic QA."
---

# Browser Exploration

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `browser-session-setup` only when this workflow reaches the step that needs it.

## Required capabilities

- `browser.automate`

## Workflow

1. Confirm the approved origin and exploration goal.
2. Map routes, primary controls, state changes, and obvious failures without editing application state beyond the requested flow.
3. Record candidate QA journeys and evidence gaps.

## Output

Return the explored surface map and repository-local screenshots when useful.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
