---
name: observability-by-design
description: "Design, implement, review, and verify product logging, distributed tracing, metrics, SLOs, and privacy-safe harness execution traces. Use for features crossing runtime boundaries, APIs, queues, external services, production operations, or evidence-gated agent workflows."
---

# Observability by Design

Use the caller-supplied `artifact_root` for every generated artifact. Keep product telemetry separate from harness execution events; they have different audiences, retention, and privacy risks.

## Select the track

- For application logs, spans, metrics, dashboards, or alerts, read `references/product-observability.md`.
- For command, phase, agent, capability, approval, or evidence events, read `references/workflow-tracing.md`.
- Load both only when the task covers both the product and its delivery workflow.

## Workflow

1. Map user-visible outcomes and system boundaries before choosing telemetry.
2. Define the questions operators and reviewers must answer during success, degradation, and failure.
3. Specify events, spans, metrics, correlation propagation, ownership, redaction, sampling, retention, and cost limits.
4. Reuse the repository's telemetry libraries and conventions; do not introduce a parallel stack without an approved decision.
5. Implement instrumentation at the boundary that owns the fact. Do not infer downstream success from an upstream log.
6. Exercise one success path and one material failure path, then prove the expected telemetry can reconstruct the sequence.
7. Record gaps, dashboards, alerts, SLOs, and rollback signals beneath `artifact_root`.

## Non-negotiable safeguards

- Never record credentials, session tokens, authorization headers, raw prompts, chain-of-thought, or unrestricted tool payloads.
- Minimize personal and customer data; use stable opaque identifiers where correlation is necessary.
- Do not claim end-to-end tracing when correlation breaks at a service, queue, job, tool, or external-provider boundary.
- Separate `TESTED`, `PARTIAL`, and `INFERRED` evidence.
- Provider or MCP availability never grants authority for a production mutation.

## Output

Return an observability plan, instrumentation changes or review findings, verification evidence, and remaining blind spots. When harness tracing is active, append schema-valid events with `record-workflow-event.mjs` rather than hand-authoring JSONL.

## Stop conditions

- Stop when the required questions can be answered from verified telemetry and every critical blind spot has an owner.
- Stop and report a blocker when validation requires unavailable runtime access, protected data, or unapproved production probing.
