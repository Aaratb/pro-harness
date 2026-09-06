# Business-rule signals

A business rule decides an outcome; plumbing moves, converts, persists, or displays information.

Look for:

- validation that accepts or rejects a meaningful domain state;
- authorization based on role, scope, ownership, or policy;
- calculation, pricing, quota, ranking, eligibility, or allocation;
- state-transition guards and lifecycle invariants;
- fallback, prioritization, routing, or product configuration decisions;
- tests phrased as product behavior rather than framework wiring.

Classify each relevant file as rule owner, mixed, transport, persistence, presentation, or wiring. A filename is not proof. `business-logic-only` requires a cited rule plus a whole-file scan showing no material transport, persistence, or wiring responsibility. Explain the customer or operator consequence only when repository evidence establishes it; otherwise label the link inferred.

