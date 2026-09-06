# Phase 3 — Architecture Findings

Run the conformance and security owners plus only material specialist lanes against the same immutable context packet. Each lane returns typed claims, evidence references, findings, fitness or measurement specifications, outcome recommendations, and blockers.

Findings include identifier, attribute, severity, statement, scope, blast radius, evidence references, safe remediation direction, required verification, owner, and verification status. Severity expresses impact; evidence status expresses certainty.

Cover boundary drift, contract and consumer risk, data integrity and evolution, end-to-end and query performance, diagnostic ambiguity, operability, recovery, concurrency, overload, capacity, and triggered security focus areas. “No findings” is valid only with a description of what was examined and how.

Do not execute tests or probes. Persist sanitized canonical evidence once and reference it by identifier. Batch the material findings for independent verification.
