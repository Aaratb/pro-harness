---
name: e2e-testing
description: "Design and verify end-to-end test coverage for critical user journeys using repository-native tools and stable observable assertions."
---

# E2e Testing

Use the caller-supplied `artifact_root` for every workflow-owned artifact.
Stop if the root is missing, outside the active repository, or escapes through a symlink.

## Dependencies

- Load `test-driven-development` only when this workflow reaches the step that needs it.
- Load `webapp-testing` only when this workflow reaches the step that needs it.

## Workflow

1. Identify critical journeys, trust boundaries, test data, environment, and existing conventions.
2. Author stable tests around user-visible behavior with page abstractions and deterministic setup.
3. Run focused tests, capture exact failure artifacts, and separate application defects from environment blockers.

## Test the user's contract, not the implementation's reassurance

Identify the behavior and highest-consequence way it can be wrong before choosing selectors. For each risk-selected case, specify precondition/role/data, action, expected observable result, and durable or recovery assertion. Include negative boundaries and nearby regressions when changed behavior can affect them.

Use known fixtures and independent expected values. Avoid assertions that merely restate the implementation, check only a toast, or pass when no relevant record is present. Verify the test fails under the relevant broken behavior where feasible; retain the failing proof for a fix. Select unit, integration, browser, and AI evaluation layers by the failure each can actually expose—not by a blanket coverage target.

Exercise refresh, navigation, focus recovery, concurrent/stale updates, retry, and authorization only where applicable. Observe writes through a fresh read or appropriate authoritative boundary. Record executed, failed, blocked, and not-run scenarios separately; mocked endpoints cannot certify live integration, and helper tests cannot certify a journey.

Example: a read-only user seeing a disabled button does not prove mutation is forbidden. Test the protected action at its enforcing boundary and then verify the data did not change. Do not delete or weaken a flaky/failing test to declare completion; isolate its cause and report unresolved evidence honestly.

## Output

Return test paths, execution evidence, coverage gaps, and artifact locations.

## Stop conditions

- Stop when the requested outcome and its evidence are complete.
- Stop and report a blocker when required repository evidence, authorization, or a declared capability is unavailable.
- Do not expand repository, network, production, or external-message scope without explicit approval.
