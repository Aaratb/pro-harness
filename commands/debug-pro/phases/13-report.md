# Phase 13 — Report & Review Return

Always publish `DEBUG_REPORT.md` and the shared privacy-safe `run-events.jsonl`, even for missing access, no reproduction, failed verification, budget limits or decision requests. Include scope, trusted baseline, evidence, root-cause tier, proof chronology, changed files, uncertainty, blockers, prevention, teardown and next owner.

Prove all temporary instrumentation/probes removed without removing permanent repair or existing dirty work. A teardown failure blocks resolved status; the report still ships.

For every repair attempt, read the repair-and-handoff reference and emit canonical `resolution.json`. Validate with `scripts/validate-debug-resolution.mjs --repo-root "$REPO_ROOT" --artifact-root "$ARTIFACT_ROOT" --resolution "$ARTIFACT_ROOT/resolution.json"`; include original `--review-root` and `--handoff` only for Review origin. Quote actual exit status. Run command and shared trace validation too.

Lead with the user-visible outcome, supported mechanism and decisive proof, then residual harm and the next owner/action. Check report evidence for actual chronology, meaningful assertions, independent review and teardown: validator acceptance authenticates declared structure/context, not the truth of those claims. Keep reviewer provenance and dissent in the existing report, never fabricated agent commands or added packet fields.

Recommend `/review-pro <target> --reverify <absolute-resolution-path>` only from validated context. Do not execute it automatically or invent direct-run Review IDs. Review Pro independently determines readiness.

Gate: honest terminal report always exists; a success claim requires all mandatory repair proof and passing validators. Report unresolved or partial outcomes without overstating causal certainty.
