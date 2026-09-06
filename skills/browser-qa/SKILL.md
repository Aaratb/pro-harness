---
name: browser-qa
description: "Run systematic browser QA in report-only or approved-fix mode across critical journeys, edge states, and visible regressions."
---

# Browser Qa

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `browser-exploration` only when this workflow reaches the step that needs it.
- Load `webapp-testing` only when this workflow reaches the step that needs it.

## Required capabilities

- `browser.automate`

## Workflow

1. Select `report-only` by default or `fix` only when repository edits are explicitly authorized.
2. Test critical journeys, permissions, responsive states, errors, refresh, navigation, console, and network behavior.
3. For fixes, reproduce first, apply one scoped fix, and rerun the exact journey.

## Adversarial behavioral evidence

Derive a risk-selected coverage set from the approved journeys, changed behavior, adjacent regressions, roles, states, and relevant viewports. Record planned versus actually executed coverage in the existing report: passed, failed, blocked, or not-run, with evidence references. Count unique tested scenarios, not screenshots. A missing capability or disabled test is a gap, not a pass.

For each interaction: establish role/authentication and state, perform the action, compare expected with observed outcome, and verify the relevant durable effect or recovery. Capture before/action/after evidence when it explains the finding. A screenshot proves appearance at a moment, not that saving, navigation, focus, or permission enforcement works. Use source/network/state evidence only within authorized scope and redact sensitive content.

Try to disprove the happy path: repeat/reload/back, delayed responses, interrupted work, unavailable data, denied permissions, and escape/recovery controls where relevant. Separate observed product defects from untested hypotheses and environment failures. Never disable or weaken a failing regression merely to obtain a green verdict.

Example: a “Saved” toast plus a click log does not establish persistence; verify a fresh read/reload using an independently known expected value. Do not claim that check ran if only static evidence was supplied. Report the highest-value next check and the remaining risk, not an unsupported percentage.

## Output

Write the QA report, evidence, and any verified fixes beneath `artifact_root`.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
