---
name: architecture-diagnostics
description: "Assess whether system telemetry and playbooks can distinguish, localize, and safely test material failure hypotheses."
---

# Architecture Diagnostics

Map components, request and job paths, asynchronous transitions, correlation identifiers, owners, logs, traces, metrics, alerts, dashboards, and runbooks.

For each material symptom, enumerate plausible causes and the signal or bounded test that distinguishes them. Flag ambiguous signals, missing propagation, cardinality hazards, unsafe payload capture, unowned alerts, and diagnosis paths that depend on broad production access.

Measure diagnostic quality through time to detect, time to localize, hypothesis discrimination, false-positive risk, and safe next action. Missing telemetry is not healthy telemetry.

Return the signal graph, ambiguity register, and verification specifications beneath the caller-supplied `artifact_root`.
