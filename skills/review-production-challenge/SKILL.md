---
name: review-production-challenge
description: Apply Review Pro’s edge-case, failure-story, security, scalability, observability, hygiene, README, and Top 5 production-risk matrices.
---

# Review Production Challenge

Use this skill in review, production, runtime-evidence, and synthesis phases.

1. Complete applicability rows with exactly `PASS`, `FAIL`, `N/A`, or `UNVERIFIED`; `N/A` requires a path-based reason and `UNVERIFIED` requires a blocker.
2. For every changed risk-bearing path, evaluate dependency outage, simultaneous execution, malicious or malformed input, and 10x volume.
3. Keep modeled scale evidence separate from representative measurement.
4. Review structured logging, correlation, tracing, metrics, alerts, redaction, deployment, degradation, recovery, rollback, runbooks, and ownership where applicable.
5. Inspect hygiene and README drift without editing either.
6. Produce exactly five ranked production-risk slots without manufacturing filler findings.

Read `references/readiness-matrices.md` before Phase 5 and retain the full required rows even when they are not applicable.

## Reason through the scenario

The matrices preserve coverage; completing rows is not the review's objective. Select the changed paths where a realistic failure would materially affect users, operators, data, or cost. Walk the trigger and preconditions through the affected components, existing protections, observable result, containment, and recovery. Cite the evidence at the boundaries where the outcome changes. Record the reasoning in the existing failure stories and lane report, not a second scenario document.

Combine conditions when the implementation makes them interact. A timeout followed by retry may duplicate an external effect; a dependency outage may hold database connections while retries increase demand; a rollout may pair an old reader with a new data shape. Explain the sequence and the shared constraint that permits the effect rather than enumerating unrelated edge cases. Search for idempotency, cancellation, backpressure, isolation, compatibility, or recovery controls that could refute the concern. Do not assert a cascade merely because several services exist.

Tie performance and cost claims to the actual work: request or job rate, work per operation, fan-out, retries, payload size, retention, and the limiting resource. State units and assumptions; distinguish per-request cost from total demand and transient headroom from sustainable capacity. Ten times the users does not automatically mean ten times every resource. Source-level arithmetic can identify a plausible limit but cannot establish measured latency, throughput, saturation, or an outage. Representative measurement requires actual approved execution evidence.

For operability, ask how an operator would detect the selected failure, distinguish it from a neighboring fault, contain it, and restore the intended user outcome. Follow correlation and redaction through the path; the presence of a logger or dashboard does not prove that the failure is diagnosable. Check whether rollback also restores data and compatibility, and whether a documented restore or fallback has been exercised. Keep unexecuted mechanisms explicitly unverified rather than inventing runbook proof.

## Calibrate the release decision

Rank evidence-backed risks by customer harm, exposure, blast radius, persistence, and recovery difficulty. Explain which condition changes merge or release readiness and which improvement can safely follow later. A mitigation lowers risk only where its scope, activation, and ownership match the failure. Avoid duplicate findings for different symptoms of the same supported mechanism, without conducting Debug Pro's root-cause investigation.

Keep `PASS`, `FAIL`, `N/A`, and `UNVERIFIED` meanings intact. A static control may support a source-level claim without proving runtime recovery; note that distinction in the existing evidence fields. Unknown applicability requires bounded investigation or an explicit gap, not convenient `N/A`. Exactly five risk slots remain a reporting envelope, not a target number of defects or a reason to manufacture severity. Preserve unused slots honestly.

This skill grants no execution authority. Use only the caller's approved read scope and capabilities; do not mutate the reviewed checkout, run live attacks, diagnose root causes, or apply fixes. Optional load or mutation evidence requires the command's exact flags, runtime authorization, and an approved isolated environment; scenario prose does not authorize an experiment. Proposed checks remain proposals until actual authorized results exist.

Write only beneath the caller-supplied `artifact_root`; never invent an alternate output folder.
