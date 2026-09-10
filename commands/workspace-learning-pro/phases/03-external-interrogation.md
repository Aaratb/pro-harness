# Phase 3 — CodeQA Interrogation

Use one accumulating read-only CodeQA conversation to challenge the local model and close material gaps.

## Setup

Read `$HARNESS_ROOT/skills/workspace-learning-core/references/external-interrogation.md` completely. Resolve remote owner/name, requested branch, and expected commit SHA from current local Git without exposing credentials. Confirm that all seven required native CodeQA MCP operations, including `list_conversations`, remain exposed and `health` succeeds. Native MCP is the sole transport for new tasks, continuations, and recoveries.

If the surface is unavailable, unhealthy, or missing an operation, preserve state, record the Phase 3 blocker, and stop. If the surface is not provisioned in this environment at all, take the unreachable-provider route below instead of blocking.

## Unreachable provider

CodeQA is a second perspective, not a precondition. Take this route only when no task can exist for this repository, and only for one of two causes:

- `mcp-surface-absent` — the native MCP surface is not provisioned in this environment.
- `repository-not-accessible` — the surface is healthy, but the provider cannot reach this repository, so a dispatch can never produce a task. A rejection such as HTTP 422 for a repository outside the organisation the installation is granted is the typical evidence.

Everything else stays blocked. A task that failed, was cancelled, refused, timed out, or returned an empty or non-semantic result is an outcome of a reachable provider, and follows the ordinary recovery contract. If a dispatch intent is unresolved, reconcile or resolve it first.

Record the exact provider evidence, then attest once:

```text
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-unavailable --workspace <workspace> --repo <repo> --cause <mcp-surface-absent|repository-not-accessible> --evidence-id <immutable-provider-evidence-id> --reason <text>
```

The attestation is immutable and is refused whenever any task or round is already recorded. Write the cause, the evidence ID, and the resulting limits into `EXTERNAL-INTERROGATION.md`, stating plainly that the model rests on local source alone and which questions a second perspective would have been used to challenge. Then complete Phase 3 on the local-source model. `codeqa-convergence` reports `eligible` with `mode: codeqa-unavailable`, and Phases 4–8 proceed under their ordinary gates.

Such a repository completes in the ordinary sense; it is not a lesser tier and must not be reported as one. Keep the provenance visible rather than the status downgraded: `codeqa-status` and the dossier always show whether a lineage actually ran.

Before any CodeQA creation call, load the persisted Phase 3 task, latest status/result/round, recovery generation, and dispatch intent. If an MCP task exists, resume it. If an unbound intent exists, do not call `ask` or `continue_task`; phase re-entry, compaction, timeout, or missing chat never authorizes a second dispatch. Create a fresh MCP task only without an active task or after explicit recovery closes the old task. Never reconstruct or silently replace identity.

Use the helper's typed lifecycle for every transition. Start each entry or resume with:

```text
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-status --workspace <workspace> --repo <repo>
```

## Crash-safe dispatch

Before every external start, continuation, or recovery, generate a unique intent ID and the final exact prompt/comment bytes containing that intent ID as `Workspace Learning dispatch intent: <intent-id>`. Compute their SHA-256, then reserve before the provider call:

```text
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-reserve --workspace <workspace> --repo <repo> --intent-id <intent-id> --kind <start|continue|recover> --transport mcp --prompt-sha256 <64-hex> --expected-generation <N> [--parent-task-id <P>|--from-task-id <F>] --reason <reason>
```

Use expected generation `1` for `start`, the current generation for `continue` with its current parent task ID, and current generation plus one for `recover` with its terminal source task ID.

Only after reservation, make the one matching MCP call. `codeqa-start`, `codeqa-continue`, and `codeqa-recover` require the matching `--intent-id`; immediately bind the returned or discovered task ID:

```text
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-start --workspace <workspace> --repo <repo> --intent-id <intent-id> --task-id <id> --transport mcp --status <status> --reason <selection-reason>
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-continue --workspace <workspace> --repo <repo> --intent-id <intent-id> --task-id <new-id> --parent-task-id <completed-current-id> --transport mcp --status <status>
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-recover --workspace <workspace> --repo <repo> --intent-id <intent-id> --task-id <new-id> --from-task-id <terminal-old-id> --transport mcp --status <status> --reason <explicit-user-recovery>
```

`codeqa-status` exposes any reserved-but-unbound intent. It blocks another dispatch, convergence, and Phase 3 completion. Reconcile it with `list_conversations`, then `get_task` and `get_task_logs` for candidates. If exactly one task matches the intent ID and prompt hash, bind it without another MCP dispatch. Missing or ambiguous lookup stays blocked. Only when lookup proves no matching task exists and the user explicitly authorizes retry may you run:

```text
node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" codeqa-resolve-intent --workspace <workspace> --repo <repo> --intent-id <intent-id> --resolution no-task-created --evidence-id <immutable-lookup-evidence-id> --reason <reason> --user-authorized true
```

Then create and reserve a new intent. This is a fail-closed, at-most-one automatic dispatch guarantee, not exactly-once provider execution.

For a new or recovered MCP generation, reserve then call `ask` once. Its final prompt must contain the intent ID, requested branch, and expected SHA and require confirmation of the actual ref/SHA. For a continuation, reserve then call `continue_task` once. Bind the real ID before polling, delegation, or yielding. Never supply a desktop auth token or user ID.

For a persisted MCP task, first call `get_task` and `get_task_logs`; do not make a state-changing call until its current state is known. For `CREATED`, `PENDING`, or `RUNNING`, wait and poll the same task. For `COMPLETED`, checkpoint any previously unrecorded result exactly once, verify it locally, and call `continue_task` only when the completed turn was successful and a next source-backed gap question exists. Persist any task ID returned by continuation before polling. For `FAILED` or `CANCELLED`, follow the failure rules below and never create a duplicate task.

Keep `PENDING` poll-by-default: status or time alone never authorizes cancellation. Apply the reference's recursive-delegation recovery only when `get_task` plus logs establish the cause and the user explicitly authorizes it. Cancel through native MCP, confirm and `codeqa-observe` `CANCELLED` (otherwise poll the same ID without dispatch), then explicitly recover through the normal reserve–`ask`–`codeqa-recover` path with the required self-investigation/no-delegation prompt.

A pre-existing legacy CLI task may be inspected and polled read-only under its exact persisted identity and original transport only until terminal. Never use CLI to create, continue, resume, cancel, retry, or recover a task. If its status cannot be observed without new authentication or credentials, preserve state and remain blocked. After terminal evidence is checkpointed, preserve the legacy lineage as audit evidence; before starting a subsequent MCP generation, explicitly tell the user, `Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed.`

If the CodeQA result does not prove an exact repository/ref/SHA match, record branch/ref parity as `mismatch` with a bounded limitation. Do not treat branch-dependent claims as evidence for the expected SHA. Exact-ref uncertainty never authorizes another transport.

On a failed MCP task, inspect it and its error logs, report the error, and ask whether to cancel, retry with context, or investigate. Do not auto-continue, auto-resume, retry, or create a replacement. Treat `CANCELLED` as terminal and non-resumable; a replacement requires an explicit user-authorized recovery checkpoint and a fresh MCP generation. The outer start/continue request authorizes successful follow-up turns in this repository only.

## Loop

For each turn, preserve this exact order:

1. After every MCP status read, call `codeqa-observe --workspace <workspace> --repo <repo> --task-id <current-id> --transport mcp --status <observed-status>`. Nonterminal status movement may reflect a real queue; keep polling the same ID.
2. On MCP completion, inspect the terminal payload separately from its lifecycle status. Call `codeqa-result --workspace <workspace> --repo <repo> --task-id <current-id> --transport mcp --result-id <immutable-provider-result-id-or-task-scoped-sha256> --semantic-success <true|false>`. If the provider exposes no immutable result ID, use `task:<task-id>:sha256:<hex>` of the exact terminal semantic result bytes so identical answers from different tasks remain distinct. This checkpoint identifies ingestion; it does not store the raw result. Use `true` only for a successful, non-empty semantic answer. A persisted refusal, error payload, or empty answer uses `false`, cannot become a round or continuation, and may be replaced only through the explicit user-authorized MCP `codeqa-recover` path even when provider status is `COMPLETED`.
3. Only then use a fresh `repository-explorer` invocation to check new material statements against current local source, their callers and outer client/middleware layers, relevant inspected tests, and at least one counterexample or alternate path. Promote, demote, or quarantine claims; update the repository artifacts and coverage, per-operation authority, state/side-effect, failure/recovery, evidence-limit, bounded-search, contradiction, unknown, and ref-parity records.
4. After that local reconciliation is complete, call `codeqa-round --workspace <workspace> --repo <repo> --task-id <current-id> --transport mcp --round <next-number> --round-name <canonical-name> --lens <distinct-lens> --novelty <material|represented|none> --locally-reconciled true`. `represented` means the item was already represented and has now been verified locally; otherwise use `material` or `none`.
5. Feed material corrections into the same conversation. When a next source-backed challenge exists, finalize its intent-bearing bytes, reserve `continue`, call `continue_task` once, and immediately bind its ID with intent-bound `codeqa-continue` before polling or yielding.

A historical MCP checkpoint with exact provider-verifiable IDs, prompt bytes/hashes, statuses/results, semantic success, and direct lineage may be imported by reserving then binding each already-existing task in order without external dispatch, followed by its observations/results/rounds. Missing, ambiguous, or branched identity blocks import. An untyped legacy CLI record is archive-only and cannot be imported into the active lifecycle or authorize a provider call.

One round is one terminal, successful semantic CodeQA response followed by local reconciliation. Polls, progress logs, retries, or repeated wording are not rounds and cannot advance the novelty window. Complete at least atlas, source challenge, invariants/failure, and history/misunderstanding rounds. For each material mutating or asynchronous flow, Round 3 must produce operation-specific state/side-effect timelines and failure matrices covering uncertain remote outcomes, enqueue/publish failure, retry exhaustion, durable retention/DLQ, reconciliation, detection, recovery owner, and true completion; if none exists, record the bounded search and evidenced `not_applicable` disposition. Continue gap-closure rounds with distinct open-cell and counterexample lenses until the Phase 4 gate can be evaluated. A fixed round count never establishes completion.

Every current conversation uses native MCP. The only cross-transport access is read-only observation of an exact pre-existing legacy CLI task until terminal; subsequent work starts a fresh MCP generation after the explicit switch notice. Store concise auditable records in `EXTERNAL-INTERROGATION.md`, not full transcripts or hidden reasoning.

When all four named core rounds and the two-round novelty window appear eligible, run `codeqa-convergence --workspace <workspace> --repo <repo>`. An unbound intent or other helper rejection returns to the loop. Helper success proves only typed lifecycle/novelty prerequisites; Phase 4 still evaluates every evidence gate.

## Exit

Require no unbound intent. Persist MCP health, intent history/resolution evidence, legacy observation/switch, terminal task status, rounds/novelty, operation/failure deltas, evidence limits, coverage, ref-parity limitation, contradictions, and the Phase 3 checkpoint.
