# Phase 3 — Targeted Observation

Read the evidence reference when acquiring protected/live telemetry or interpreting unfamiliar signals. Select only relevant observations: first-hand failure, worker/service/job logs, platform state, traces, client console/network, metrics, and change context.

These are diagnostic options, not a mandatory seven-row sweep. Read source early when it makes acquisition more precise. Gather before interpreting; a missing substrate is not an empty healthy result. Record actual provenance, scope, freshness and output. Redact before persistence.

Gate failing-operation invocation on its side effects. Never repeat money/message-emitting or non-idempotent actions against a shared target to obtain evidence. Use a safe fixture or record the access gap. `--observe-only` permits no active probes or invocations.

Gate: the smallest relevant evidence packet is available, or its explicit limitation and safe restore action are in the report.
