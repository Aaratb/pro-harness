# Harness execution tracing contract

## Event model

Record only real execution boundaries, not internal reasoning steps. Use exact schema labels:

| Activity | Event labels |
|---|---|
| Run | `run-started`, `run-resumed`, `run-completed` |
| Phase | `phase-started`, `phase-completed`, `phase-skipped`, `phase-blocked`, `phase-waived` (require `--phase`) |
| Skill/agent | `skill-loaded`, `skill-completed`, `agent-dispatched`, `agent-completed` |
| Capability | `capability-resolved`, `capability-used` |
| Evidence | `evidence-created`, `evidence-validated` |
| Approval/gate | `approval-requested`, `approval-recorded`, `gate-evaluated` |
| Failure | `retry-attempted`, `degraded`, `terminal-failure` |

Statuses: `planned`, `in-progress`, `passed`, `failed`, `skipped`, `degraded`.
There is no `workflow-started`, `skill-skipped`, or status `started`. For an applicable skipped skill use `skill-completed --status skipped`; do not enumerate every unused optional skill.

Each event identifies the workflow run, phase, actor, outcome, repository-relative evidence references, and duration when known. The containing `run-events.jsonl` path binds the repository-local artifact root. Use the shared workflow-event schema.

The coordinator alone serializes appends. Run the writer with `--help` for schema-derived vocabulary. Repeat `--artifact` for paths relative to the artifact root. Set `WORKFLOW` to the actual invoked command name, `ARTIFACT_ROOT` to its resolved repository-local root, and `PHASE` to the current phase number. A minimal lifecycle follows; each command runs at its actual boundary, not retrospectively. Replace `~/.agents` with the resolved active installation when using a runtime adapter.

```bash
node ~/.agents/scripts/record-workflow-event.mjs \
  --artifact-root "$ARTIFACT_ROOT" --workflow "$WORKFLOW" --run-id "$RUN_ID" \
  --event run-started --status in-progress --summary "Workflow run started"

node ~/.agents/scripts/record-workflow-event.mjs \
  --artifact-root "$ARTIFACT_ROOT" --workflow "$WORKFLOW" --run-id "$RUN_ID" \
  --event phase-started --phase "$PHASE" --status in-progress --summary "Phase work started"

# Only after the work and any required approval actually finish:
node ~/.agents/scripts/record-workflow-event.mjs \
  --artifact-root "$ARTIFACT_ROOT" --workflow "$WORKFLOW" --run-id "$RUN_ID" \
  --event phase-completed --phase "$PHASE" --status passed \
  --summary "Phase work completed"
```

Validate the stream without rewriting it:

```bash
node ~/.agents/scripts/validate-workflow-trace.mjs \
  --artifact-root "$ARTIFACT_ROOT" --workflow "$WORKFLOW" --run-id "$RUN_ID"
```

## Privacy boundary

Allowed: canonical names, timestamps, durations, status, error category, redacted summary, hashes, repository-relative artifact paths, and external resource identifiers already approved for the workflow.

Forbidden: raw prompts, hidden reasoning, source-file bodies, unrestricted terminal output, credentials, cookies, authorization headers, personal data, and external response bodies.

## Resume behavior

The event stream is evidence, not mutable state. `state.json` remains the current checkpoint. On resume, validate state and trace independently; append `run-resumed`, not a second `run-started`. Continue an already-started phase without duplicating its start. Never invent missing phase events or treat an absent completion event as success.

## Failure behavior

The writer validates the candidate and existing stream before append. Stop a shell batch on its first failure (use `&&` when batching); never continue appending completions after rejected starts. Correct invalid inputs before retrying once. Buffer at most one event; do not spend repeated turns attempting trace repairs. A busy writer lock fails immediately; never delete another writer's lock. After a crash, verify no writer remains before operator-authorized stale-lock removal.

If history is already invalid, preserve it unchanged and mark tracing degraded in state. Do not backfill starts, rewrite timestamps, or claim the trace passed. Validation reports schema, sequence, and privacy independently: a sequence gap is not itself a privacy breach or product failure. Continue unrelated authorized work where permitted, but retain the explicit trace concern at hard gates and handoff; this is not an automatic gate waiver.

## Approved trace-only continuation

Supported workflows: Feature Pro, Architecture Pro, Review Pro, and Explainer Pro. Debug and Outcome retain their existing policies. Use the same recorder and validator; no new logging service or workflow state engine is needed.

For an existing sequence-only failure, ask for explicit user/operator recovery approval. Reconcile the saved checkpoint against opened artifacts and actual checks first. Record the stale-state discrepancy, reported resume phase, reusable evidence, unresolved prior gates, and authority in one repository-local Markdown report. Do not infer completed phases or approvals from filenames. Recovery does not require restarting completed feature work.

```bash
node "$HARNESS_ROOT/scripts/recover-workflow-trace.mjs" \
  --artifact-root "$ARTIFACT_ROOT" --workflow "$WORKFLOW" --run-id "$RUN_ID" \
  --checkpoint trace-recovery-checkpoint.md \
  --approval "User approved trace-only continuation in the current conversation"
```

This preserves `run-events.jsonl` byte-for-byte and creates `run-events.continuation.jsonl` plus `trace-recovery.json`. The manifest binds the original, checkpoint report, and new segment's first actual-time event by SHA-256. The original remains failed ordering evidence; never edit the bound report after recovery. Subsequent writer and validator calls discover this fixed continuation automatically; no extra flags or alternate artifact root are needed.

The validator reports `recovered-with-gaps` only when that link and the active sequence validate, while returning historical failures separately. This satisfies only the trace portion of a gate. Product quality, privacy, security, upstream approvals, and release gates remain independently enforceable. A saved `current_phase` may identify a reassessment point, not prove that earlier phase gates passed. Do not manufacture retrospective events or agent runs. For Feature Pro's Setup Audit, reconcile pending gates before Phase 16.

For Feature Pro, update `workflow_trace.path`, `status`, accepted `last_event_id`, and `validated_at` from the verified result. For Architecture and Explainer, retain `run-events.jsonl` as the logical history anchor and set the existing state trace status to `degraded`; do not invent incompatible schema fields. Review records the qualification in its existing report. The completion hook returns the validated `workflow_trace` qualification and historical failures: include these in the handoff, never label the original trace clean. The recovery manifest links the checkpoint report; retain unresolved checkpoint gaps there and in the existing report/state fields. The helper never edits state or passes product gates.

For Explainer, include `recovered-with-gaps` in the existing coverage limitations and publish that disclosure in the next generation before completion. State and published coverage must agree. Reuse unchanged verified claims; do not rewrite a published generation or repeat teaching work merely to add the trace disclosure.

## Efficient boundary validation

Record the accepted run start before phase or skill events. A rejected event is not an accepted checkpoint. Retry a corrected input once, not an entire phase. Use each command's lifecycle hook as the single completion entry point; do not separately rerun validators already covered by that hook against the same unchanged inputs. Revalidate if source, artifacts, scope, authority, or loaded contracts change, and on resume. There is no persistent validation bypass/cache. A sequence-only recovery is a qualified trace result, not missing product evidence; privacy, schema, identity, tampering, and authority failures remain blocking.

Recovery rejects malformed/private traces, mixed run identities, terminal runs, changed hashes, escaping/symlinked paths, busy locks, and existing recovery output. It supports one continuation, not an unbounded recovery chain. Partial output after interruption fails closed: preserve it and request operator reconciliation; never delete it automatically to retry. A fresh command invocation/reload is sufficient when active wrappers already point to the patched canonical harness; restarting the feature is not required.
