# Readiness matrices

## Logic and boundary matrix

Assess null, missing, empty, minimum, maximum, off-by-one, invalid type, malformed and unknown input, duplicates, retry, reordering, timeout, dependency failure, partial failure, cancellation, disconnect, concurrency, stale state, authorization, wrong tenant, large input, and 10x volume.

## Hygiene ledger

Inspect dead files, exports, imports, and configuration; stale comments; temporary debug code; raw debug logging; unowned TODO/FIXME/HACK markers; deleted-symbol references; broken links and anchors; obsolete flags; orphaned locale keys; duplicates; committed generated artifacts; misplaced tests; stale documentation; expired compatibility code; and stale examples. Respect generated/vendor exclusions and repository conventions.

## Four-part failure story

For dependency outage, simultaneous execution, malicious input, and 10x volume, record applicability, status, current behavior, scenario, evidence, customer and resource impact, degradation, recovery, protections, gaps, recommended validation, and associated finding ID when failed.

## Performance and operability

Cover applicable CPU, memory, database plans/pools/locks, cache stampede, queues, workers, network and dependency limits, fan-out, payloads, client bundle and responsiveness, retry amplification, telemetry, SLOs, alerts, deployment, rollback, recovery, and ownership. Representative measurement records workload, duration, concurrency, data size, environment, p50/p95/p99, throughput, error rate, and saturation.

## Top 5 risks

Each populated slot binds one authenticated finding and includes confidence, evidence status, customer pain and blast radius, resource category, production scenario, trigger, affected component, available and expected telemetry, containment, permanent direction, validation, and owner. An unused slot uses `NO_ADDITIONAL_EVIDENCE_BACKED_RISK`, null finding ID, and zero confidence.
