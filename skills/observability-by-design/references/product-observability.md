# Product observability contract

## Required design

Define telemetry from operational questions, not from a blanket instruction to "add logs."

| Surface | Required decision |
|---|---|
| Logs | Structured event name, severity, owning component, correlation fields, redaction class, and actionable message |
| Traces | Entry span, child boundaries, async propagation, external-call span, status semantics, and sampling |
| Metrics | Counter/gauge/histogram choice, units, dimensions, cardinality budget, and aggregation window |
| SLOs | User-visible indicator, target, measurement window, error budget, and owner |
| Alerts | Symptom, threshold, duration, destination, runbook, and false-positive control |
| Dashboards | Audience, questions answered, links, filters, and release annotations |

## Correlation sequence

Propagate a repository-standard correlation or trace identifier through every applicable boundary:

1. user/client request;
2. edge or API entry;
3. service and database work;
4. queue or background job;
5. external provider;
6. response or asynchronous outcome.

Document where propagation is impossible. A generated sequence diagram must distinguish intended propagation from observed spans.

## Data policy

- Default to metadata, not payloads.
- Redact secrets before serialization; masking only at the viewer is insufficient.
- Treat prompts, completions, uploaded content, and tool arguments as potentially sensitive customer data.
- Bound high-cardinality labels. Never use raw user input, URLs with query secrets, stack traces, or full IDs as metric dimensions.
- Set retention and sampling according to debugging value, legal constraints, and cost.

## Verification

Exercise a success path and one significant failure. Capture the correlated event/span sequence, metric movement, redaction proof, and the operator action enabled by each signal. A server starting or a log line existing is not proof that the journey is diagnosable.
