# Phase 7 — Tests Runtime and Observability

## Goal

Collect direct verification for the change using existing project mechanisms and explicitly authorized environments.

## Load

- `repository-health`
- `observability-by-design`
- `review-production-challenge`
- `ai-product-engineering` and its evaluation reference only for affected AI behavior
- MCP contracts for browser or observability reads only when authorized

## Procedure

1. Inspect existing focused tests and configured commands for side effects before execution. Run only checks compatible with the source-read-only boundary and approved environment; install/update modes, snapshot writes, generated files, database resets, network calls, and lifecycle scripts are not made safe by being named "test". Use an already-approved isolated mechanism when needed, otherwise record the execution gap. Do not author or change tests, configuration, fixtures, snapshots, or source.
2. Evaluate assertion quality and coverage of negative cases, authorization and tenant denial, concurrency and idempotency, malformed input, dependency failure, and changed contracts.
3. Run mutation testing only with `--mutation` and existing support. Run bounded load or latency verification only with `--load` in an approved isolated local or staging environment—never production.
4. For applicable APIs, jobs, workers, queues, and external calls, verify structured logs, stable identifiers, correlation and trace propagation, spans, retries, timeouts, latency, error classification, redaction, metrics, alerts, and async context.
5. For an approved HTTP surface, use separate log-observation and request-execution sessions. Build commands from trusted project configuration and structured arguments, use synthetic data, and record sanitized commands, IDs, status, latency, retries, missing spans, and redaction behavior.
6. Unavailable runtime, telemetry, credentials, or environment access remains `UNVERIFIED` with the smallest unblock action.

Use `repository-health` to inspect the actual assertion: independent expected value, setup, action, durable outcome, and the boundary a mock replaces. Ask whether the test would fail for the candidate regression without changing code to try it. Record skipped, disabled, stale, or missing cases honestly. Coverage percentage and a green command do not prove the changed invariant.

For approved non-mutating UI/API observations, verify session/role, relevant state, exact build, response meaning, and any permitted independent readback. A toast, screenshot, or HTTP 200 does not establish durable success. Do not perform a state-changing journey under inspect-only authority; record missing evidence instead. For AI quality, inspect evaluation provenance, version, representative slices, baseline, threshold, and uncertainty separately from ordinary unit tests. Proposed checks remain not-run until actual authorized evidence exists.

## Gate

Pass with exact command or observation evidence and exit status for every required claim. Never let a passing unit test stand in for runtime, security, or operational proof.
