---
name: webapp-testing
description: "Test a local or approved web application through browser automation with stable assertions and repository-local evidence."
---

# Webapp Testing

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `browser-session-setup` only when this workflow reaches the step that needs it.

## Required capabilities

- `browser.automate`

## Workflow

1. Confirm the approved URL, environment, authentication state, and target journey.
2. Exercise the smallest relevant flow and inspect visible state, network, console, and accessibility signals as supported.
3. Capture reproducible evidence and stop after two repeated automation failures requiring user intervention.

## Evidence quality

Begin with the behavior that could fail and the evidence needed to distinguish success from a convincing-looking UI. Confirm the actual role, tenant, session, data state, and build under test. Authentication state is part of the reproduction; a public or mocked session cannot establish signed-in behavior.

For each selected journey, capture precondition, action, and observed result. Check a durable effect through reload, an independent read, or another approved surface when persistence matters. A toast, successful click, clean console, or HTTP 200 alone does not prove the intended outcome. Inspect request and response semantics where supported without logging credentials or sensitive payloads.

Target risky transitions and adjacent regressions: stale results, failure and recovery, interrupted work, permission boundaries, repeated actions, keyboard focus, and constrained viewports as relevant. Distinguish observed defects from untested concerns and from subjective appearance. A screenshot is useful evidence of one state, not proof that the interaction works.

Keep a compact planned/executed/passed/failed/blocked/not-run record in the existing report. Explain blocked coverage and its consequence; never substitute static inspection for executed browser proof. Stop at the tool-failure limit, preserve the repro, and ask for the missing capability rather than weakening the assertion or claiming a pass.

## Output

Write browser evidence beneath `artifact_root` with steps, observations, screenshots, and blockers.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
