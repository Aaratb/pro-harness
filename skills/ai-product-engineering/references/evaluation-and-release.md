# AI evaluation and release contract

## Evaluation layers

Keep these distinct:

1. deterministic unit/contract tests for schemas, permissions, parsing, routing, and fallback;
2. fixed-set offline evaluations for task quality and regressions;
3. adversarial evaluations for injection, leakage, unsafe tools, and boundary failures;
4. human evaluation where judgment cannot be reduced to a trustworthy automatic grader;
5. online metrics for real-user quality, cost, latency, escalation, correction, and abandonment.

## Dataset integrity

Record dataset purpose, provenance, consent/authority, exclusions, version, split, contamination risk, representativeness, and retention. Keep evaluation examples separate from prompts and implementation examples when leakage would inflate performance.

## Release gate

Every quality dimension has a baseline, threshold, sample size, scorer, and uncertainty statement. Report distributions and important slices, not only an average. A model-graded evaluation names the grader model/prompt version and has a human-calibrated sample.

Block release when a critical safety or authorization case fails, a primary threshold regresses, cost/latency exceeds its budget without approval, or fallback is untested. Roll out progressively and annotate model/prompt/index changes in telemetry.
