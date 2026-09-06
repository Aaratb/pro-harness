# Phase 4 — Recommendation

Recommend from the current source/method-checked assessment, including honest insufficiency. A recommendation never starts another command or authorizes a change.

For a consequential decision compare the next step with the strongest real alternatives; consider **two credible alternatives** when available, but never invent alternatives to fill a quota. Explain why rejected using the same intended outcome, constraints, future cost/opportunity cost and downside. Include **what I'm least sure about** and the **falsifier**: the observation that makes the choice wrong. Apply the analytical method's decision sensitivity: what evidence could reverse the choice, and is collecting it worth the delay? Prefer the smallest reversible action with owner, observation window and reassessment trigger. Ranges require sourced inputs; no invented precision. A simple descriptive answer needs no executive ceremony.

Comparative recommendation vocabulary:

| Recommendation | Meaning |
|---|---|
| `CONTINUE` | All required measurements meet accepted targets with adequate evidence; limitations remain. |
| `ITERATE` | Adequate evidence supports a specified adjustment and its tradeoff. |
| `INVESTIGATE` | A specific evidence-backed question, not a confirmed defect/root cause. |
| `RETIRE` | Withdrawal is worth a responsible human's decision; no execution authority. |
| `INSUFFICIENT_EVIDENCE` | Name missing measurement/source, owner and reassessment condition. |

Insufficient measurement retains the machine `INSUFFICIENT_EVIDENCE` recommendation and `evidence_gap` follow-up. Parallel observed risks or instrumentation recommendations may be explained in the human report; they do not replace missing-evidence handling. Missing evidence never proves safety or supports retirement. `MET` describes observed measurements, not release causality.

| Follow-up | Destination and boundary |
|---|---|
| `suspected_defect` | `review-pro` validates/refutes first; never directly to Debug. |
| `new_capability` | `feature-pro` for genuinely new work or missing instrumentation, not disguised repair. |
| `structural_limit` | `architecture-pro` for an evidenced design question. |
| `evidence_gap` | `collect-evidence`, the authorized collection/setup branch in Phase 2, not a new command. |
| `none` | `none`; no workflow warranted. |

Low adoption, missed targets or unhappy feedback alone are not bugs. Do not create a Review/Debug handoff or finding identity. Outcome is supporting context for Review's own checks. Existing `skills/release-deployment/SKILL.md` and the responsible release/operations workflow own separately authorized rollout/closeout; analysis never deploys, rolls back, retires or bypasses gates. Explainer can explain any report without changing its verdict.

## Prospective revisions, immutable history

When evidence supports a changed hypothesis, target or guardrail, document old versus proposed definitions, rationale, costs, counter-metrics, decision owner and future effective window. Label **proposed** until explicitly approved. Preserve original intent/report and judge that original separately; never retroactively turn a miss into `MET` by lowering targets or removing harm. Link newly approved intent in a fresh later assessment. Feature/Architecture own necessary changes under explicit scope.

## Publish proportionately

Coordinator uses a fresh non-overwriting run root for `outcome.md`; only complete comparative assessments also use validated `outcome.json`. Partial, descriptive and experiment briefs stay human-readable. Optional `calculations.json` and minimized aggregate snapshots do not create a state ledger. Keep evidence and artifact roots distinct; never widen to a shared parent. No owner repository means chat-only output.

Human brief: decision and established/unproven outcome; baseline/observed/target table or sourced facts; guardrails/exposure/cutoff and source-to-claim proof; uncertainty and falsifier; next owner/action with authorization or blocker; selected method, actual skills/focuses, arithmetic coverage, validator result and independent challenge/disagreements. Separate recommendations from action receipts and structural validity from real-world evidence quality.

For persisted runs record privacy-safe phase/capability/validation decisions via shared `scripts/record-workflow-event.mjs`; validate with `scripts/validate-workflow-trace.mjs`. Trace only actually executed work, no raw evidence, secrets or invented approvals. Finish with the useful result, unresolved limits and smallest next step; validation success is not product success or release approval.
