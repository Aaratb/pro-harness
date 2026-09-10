# CodeQA interrogation and convergence

CodeQA supplies a second perspective and possible organizational context. Current local source remains authoritative for implemented behavior.

## Transport selection and identity

Native CodeQA MCP is the sole transport for every new task, continuation, and recovery. Require `ask`, `continue_task`, `get_task`, `get_task_logs`, `cancel_task`, `health`, and `list_conversations`, plus a successful `health` check, before Phase 3. MCP identity comes from the authenticated host runtime. Never request or pass a desktop auth token, user ID, email, a service auth token, or CLI config credential.

If MCP is unavailable, unhealthy, or missing a required operation, preserve the repository and CodeQA state, record the exact Phase 3 blocker, and stop before interrogation. Do not select a CLI/Desktop-token fallback, request credentials, or turn exact-ref uncertainty into authority for another transport.

Distinguish a provider that cannot be reached from one that was reached and did not succeed. Only two causes mean no lineage is possible: the MCP surface is not provisioned in this environment (`mcp-surface-absent`), or it is healthy but cannot reach this repository so no task can exist (`repository-not-accessible`). Attest either one once through `codeqa-unavailable --cause <cause> --evidence-id <id> --reason <text>`; Phase 3 then completes on the local-source model, `codeqa-convergence` reports `mode: codeqa-unavailable`, and the repository completes under the ordinary gates rather than being stranded. Everything else — failed, cancelled, refused, timed-out, or empty results, and unresolved dispatch intents — is an outcome of a reachable provider and follows the ordinary recovery contract. The attestation is immutable and is refused whenever a task or round is already recorded, so a failed interrogation cannot be relabelled as an unreachable provider. Keep the provenance visible: the lane is ordinary green, and `codeqa-status` still shows whether a lineage ran.

Use the native operations for every current task and record `mcp` on every current turn. A pre-existing legacy CLI task may be inspected and polled read-only under its exact identity only until terminal. Never dispatch or cancel through CLI. Preserve it as audit evidence; before subsequent work say, `Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed.`

## Dispatch intent, resume, and task identity

Start every entry with `codeqa-status`, which exposes the task plus any dispatch intent. An unbound intent blocks another dispatch, convergence, and Phase 3 completion.

For each start, continuation, or recovery, generate the final exact prompt/comment bytes first with a unique `Workspace Learning dispatch intent: <intent-id>` line. Hash those bytes, then persist before the external call:

```text
codeqa-reserve --repo R --intent-id I --kind <start|continue|recover> --transport mcp --prompt-sha256 H --expected-generation N [--parent-task-id P|--from-task-id F] --reason TEXT
```

Expected generation is `1` for `start`, current for `continue`, and current plus one for `recover`; pass the current parent for continuation or terminal source for recovery. Dispatch once, then immediately bind the returned ID through matching `codeqa-start`, `codeqa-continue`, or `codeqa-recover` with required `--intent-id I`. A recovered or exactly discovered task is bound the same way before polling, delegation, or yield.

On resume with an unbound intent, do not call `ask` or `continue_task`. Use `list_conversations`, then `get_task` and `get_task_logs`, to identify the exact intent-bearing task. Bind one exact match without dispatch. Missing or ambiguous identity stays blocked. If lookup proves no matching task and the user explicitly authorizes retry, archive/clear it with `codeqa-resolve-intent --intent-id I --resolution no-task-created --evidence-id E --reason TEXT --user-authorized true`, then create a new intent. This is fail-closed, at-most-one automatic dispatch per unresolved intent—not exactly-once provider execution.

If an MCP task ID exists, inspect it with `get_task` and `get_task_logs`. For `CREATED`, `PENDING`, or `RUNNING`, wait and poll that task. For `COMPLETED`, persist any unrecorded result exactly once, reconcile it locally, and use `continue_task` only for a next successful, source-backed gap question. For `FAILED`, inspect and report the error and require the permitted user recovery choice; never auto-continue, auto-resume, retry, or replace it. Treat `CANCELLED` as terminal and non-resumable. A replacement, when explicitly authorized, is a fresh native-MCP generation.

Treat `PENDING` as poll-by-default. Status or elapsed time alone never proves that a task should be killed. Only when `get_task` and `get_task_logs` establish that the exact task is stuck because it recursively delegated or spawned agents for this investigation may you report that cause and obtain explicit user authorization to call native `cancel_task`. Inspect the task and logs again after cancellation and persist `CANCELLED` through `codeqa-observe`. If cancellation is rejected, ambiguous, or unconfirmed, do not dispatch and keep polling the same task.

Recover a confirmed cancellation only through the explicit native-MCP recovery path. Finalize a fresh intent-bearing prompt, preserve the repository/ref/SHA and read-only constraints, add `Do not delegate any part of this investigation, spawn or invoke another agent, or recursively create a CodeQA task. The CodeQA agent handling this task must perform the repository investigation itself.`, then hash and `codeqa-reserve --kind recover` against the cancelled task. Call `ask` once and bind its returned ID immediately with intent-bound `codeqa-recover`. Never use `continue_task` for this replacement or bypass the ordinary reservation and binding rules.

Checkpoint every observed state with `codeqa-observe` and every `COMPLETED` payload once with `codeqa-result --semantic-success <true|false>`. Only a successful non-empty result reconciled locally may become `codeqa-round --locally-reconciled true`; refusal, error, or empty payload cannot become a round or continuation. Use an immutable result ID or `task:<task-id>:sha256:<hex>` of exact result bytes without storing the result.

A historical MCP checkpoint may reserve and bind already-existing exact tasks, then replay observations/results/rounds without provider dispatch. It requires verifiable prompt bytes/hashes, IDs, status/result evidence, and direct lineage. Missing, ambiguous, branched, or prose-only identity blocks import. Untyped legacy CLI is archive-only.

## Coverage matrix

Track every domain as `unseen`, `in_progress`, `covered`, `not_applicable`, or `bounded_unknown`.

| Domain | Evidence sought |
|---|---|
| Existence | originating problem, current purpose, users, ownership, separate-repository reason |
| Boundary | owned/non-owned responsibilities, public entries, process/deployment units |
| Topology | packages/modules, bootstrapping, registration, generated/vendor boundaries |
| Principal flows | entry → rules → state/effect → outcome and exits |
| Data/state | entities, writers/readers, transitions, invariants, transactions, migrations |
| Contracts | APIs/events/files/config, callers, downstream systems, compatibility |
| Timing | blocking/deferred work, acceptance, retries, ordering, idempotency, concurrency |
| Failure/security | validation, authorization, trust, failure exits, recovery, secret boundaries |
| Operations | deployment, health, telemetry, runbooks, rollback/recovery evidence |
| Verification | test layers, fixtures, contracts, missing runtime proof |
| History | material pivots, deprecated paths, visible rationale |
| Change seams | conventions, extension points, high-blast-radius areas, reading/debug paths |

`not_applicable` requires evidence. `bounded_unknown` names missing evidence and why the gap does not invalidate known boundaries.

## Operation and evidence depth

Do not assign one authority or migration state to a whole domain until each material operation supports it. For each material operation across public, event, job, cron, reconciliation, and administrative entry classes, record its entry/caller, dispatch predicate, selected authority (`local`, `remote`, `proxy`, `shadow`, `dual-write`, `overlay`, or another source-backed form), pre-dispatch alternative, post-dispatch behavior, reads/writes, locks/transaction, idempotency/deduplication, response meaning, and recovery owner. Labels such as “fallback,” “experiment,” “outbox,” “sent,” or “captured” are leads; inspect the actual predicate, bound state, callers, and write order.

For every material mutating or asynchronous flow, require:

1. a state/side-effect timeline that establishes the actual causal order among validation/authorization, gate/lock, local transaction and commit, remote effect, enqueue/after-commit work, worker/reconciler, and the strongest proven user-visible completion—without presuming one universal order; and
2. a failure matrix covering failure before a remote side effect, uncertain remote side effect, local failure after a remote effect, enqueue/publish failure, retry behavior, retry exhaustion, replay/reconciliation/manual repair, durable retention or DLQ, duplicate/loss risk, detection, and recovery owner.

When the bounded repository study finds no material mutating or asynchronous flow, record the searched entry classes and an evidenced `not_applicable` disposition instead of manufacturing a timeline or failure matrix.

Trace outer HTTP/RPC clients, middleware, queue wrappers, and transaction/after-commit adapters before deciding whether a returned non-2xx, exception, or publish failure reaches the visible catch/fallback. Distinguish accepted, locally persisted, enqueued, remotely acknowledged, delivered, reconciled, and complete; none implies the next without evidence.

Keep these evidence classes separate:

- current implementation source proves only the visible coded path at the resolved source identity;
- inspected tests show intended/asserted behavior, while mocks prove only the mocked seam and unexecuted tests do not prove the suite passes;
- routes, flags, schedules, deployment files, and generated artifacts are declarations, not proof of live allocation, traffic, execution, deployed versions, source ownership, or regeneration freshness;
- Git history can show origin, staged changes, compatibility pressure, and recorded rationale, but a filename date or commit landing date is not a deployment/adoption date; cite the commit SHA and distinguish authored, committed/landed, merged, and deployed;
- live operational behavior requires separately authorized runtime evidence and is otherwise `UNVERIFIED`.

Use claim tiers precisely. `CONFIRMED` means the exact scoped claim is directly established by the appropriate inspected evidence at the recorded identity; a commit can confirm landing but not deployment. `INFERRED` means an explicitly stated conclusion connects confirmed facts. `UNVERIFIED` means required runtime, dynamic, external-service, historical-intent, human, or missing evidence was not inspected. Record the verification surface separately as `source-inspected`, `test-inspected`, `test-executed`, `runtime-observed`, or `testimony`; one surface never silently becomes another.

Before calling a path absent, dormant, universal, exhaustive, or permanent, inspect callers, reverse references, registration/dynamic wiring, configuration, tests, relevant history, outer layers, and counterexamples. Record the searched roots, symbols/patterns, and excluded external systems, then say “not found in bounded search.” A single ADR, migration plan, ownership comment, or extraction marker cannot establish the repository's permanent end state.

## One-conversation sequence

### Round 1 — Atlas

Ask for repository purpose/boundary, runtime/deployment units, entries, three to five principal flows, data/state, contracts, first files to read, and checkout limitations. Require file/symbol citations and claim tiers.

### Round 2 — Source challenge

Present the local atlas as cited hypotheses. Ask for counterexamples, alternate entries, reverse dependencies, dynamic registration, generated edges, stale docs, outer client/middleware behavior, operation-specific exceptions, and the most likely incomplete local claim.

### Round 3 — Invariants and failure

Ask about rules, authorization, idempotency, concurrency, retries, transactions, failure exits, recovery, observability, and operational ownership. Require the operation-specific state/side-effect timelines and failure matrices above, and evidence for `never`, `only`, and `always`.

### Round 4 — History and misunderstanding

Ask why the repository remains separate, which old paths shape it, whether its origin differs from an imported prototype or later integration, which changes landed in stages, what a competent newcomer will misunderstand, and what only builders/operators can answer. Uncited rationale stays unverified; first code presence, major adoption, and production deployment are different claims.

### Gap-closure rounds

Ask narrow questions from open cells and contradictions. Seek alternate writers, dynamic paths, counterexamples, outer-layer translations, failure recovery, and behavior omitted by the start-here path. Use a different open-cell or falsification lens for each putative no-novelty round. Continue until convergence; do not stop at a round cap.

## Turn record

Record intent ID/kind/prompt hash/generation/parent or recovery source/resolution evidence, task ID, MCP health, legacy observation/switch, round, requested and reported ref/SHA, parity, question labels, material count, operation/failure deltas, confirmed citations/evidence class, demotions, bounded searches, unknowns, coverage changes, and novelty. A round requires terminal semantic success plus local reconciliation; polls/logs are not rounds. Do not persist raw transcripts or hidden reasoning.

## Materiality

An item is material when it changes purpose/ownership, a public/process/deployment boundary, a principal flow/exit/outcome, data/state/invariant/transaction ownership, trust/authorization, timing/retry/idempotency/ordering, an external contract, or a required operational/verification path.

## Convergence gate

Declare bounded convergence only when:

1. every domain has a terminal disposition;
2. every material relationship has local evidence or an explicit lower tier;
3. no contradiction can change purpose, boundary, principal flow, data/state ownership, trust, or operations;
4. every material operation has its own authority/gate/fallback/state contract, without unsupported domain-wide generalization;
5. every material mutating/asynchronous flow has a reconciled timeline and failure matrix, including retry exhaustion, retention/DLQ or bounded absence, detection, repair, and true completion;
6. evidence classes remain distinct and negative findings have bounded search records;
7. the four core rounds completed;
8. no unbound dispatch intent remains, and two consecutive distinct successful rounds, locally reconciled under different open-cell or counterexample lenses, introduced no material items or only represented items confirmed locally;
9. the model can explain why the repo exists, how outcomes happen, where rules/state live, how it connects/fails/operates, and what remains unknown;
10. residual questions identify missing evidence and the builder/operator able to resolve it.

If evidence stops while a material gap remains, record a bounded unknown. A blocked CodeQA service cannot satisfy this gate.

Evaluate the machine prerequisite with `workspace-learning-state.mjs codeqa-convergence`. It must reject any unbound intent, missing core round, stale/unrecorded task, invalid lineage/result, unreconciled turn, repeated lens, material novelty, or unverified represented item. Its success does not replace the broader evidence gate.

## Fresh-task initial prompt

```text
Start a fresh CodeQA agent and new conversation for this read-only repository interrogation. Do not resume or inherit an earlier task.

Workspace Learning dispatch intent: <intent-id>

Repository: <owner/repo>
Requested branch: <branch>
Expected commit SHA: <sha>

Before substantive analysis, report the actual repository, checked-out branch/ref, resolved commit SHA, and whether they exactly match the request. If you cannot verify any of them, say that parity is unprovable; do not imply same-ref coverage.

Goal: help build a source-grounded course explaining why this repository exists and how all material behavior fits together. Do not edit files, create branches/commits/PRs, execute the target, access production, or collect secrets/private payloads.

Independently map purpose, ownership boundary, runtime/deployment units, entries, principal flows, data/state, contracts, timing, failure/security, operations, verification, history, and change seams. Decompose domains into operations rather than assuming one authority/fallback contract. For material mutating or asynchronous flows, return a state/side-effect timeline and failure matrix covering uncertain remote outcomes, enqueue/publish failure, retry exhaustion, durable retention/DLQ, reconciliation, recovery ownership, and the strongest proven meaning of completion. Inspect outer clients, callers, tests, and counterexamples. Cite files and symbols. Keep source, test, declaration, history, and live-runtime evidence separate. Label claims CONFIRMED, INFERRED, or UNVERIFIED, and scope negative findings as “not found in bounded search.” State checkout/ref limits.

Current local coverage and questions:
<concise matrix and gaps>

Return status, summary, material claims with citations, counterexamples, unknowns, and next questions.
```

MCP `ask` has no branch field, so the repository, requested branch, and expected commit SHA above are mandatory prompt content. Missing, mismatched, or unprovable checkout/ref parity is a mismatch and bounded limitation. Exact-ref uncertainty never authorizes another transport.
