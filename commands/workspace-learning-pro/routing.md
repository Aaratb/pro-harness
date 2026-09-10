# Workspace Learning Pro routing

Read once after the opening choice and workspace scope are clear. Load only the active phase file and its references.

## Phase routes

| Phase | Primary method | Agents | External or downstream dependency |
|---:|---|---|---|
| 1 | local inventory, identity, artifact preflight | coordinator | native CodeQA MCP only; runtime docs-publisher CLI |
| 2 | `codebase-onboarding` evidence map | `repository-explorer` | local Git/source only |
| 3 | CodeQA question ladder plus local verification | `repository-explorer` verifier | one read-only CodeQA conversation |
| 4 | claim reconciliation and convergence | `repository-explorer`; optional `system-architect` or `data-model-architect` | local source/history only |
| 5 | canonical `explainer-pro` course workflow | downstream command owns its agents | `$explainer-pro`, COURSE, FSB, no codemap |
| 6 | canonical runtime docs-publication workflow | coordinator | authenticated docs-publisher CLI |
| 7 | canonical `workspace-codemap-pro` workflow | downstream command owns its agents | `$workspace-codemap-pro` for one repository |
| 8 | artifact/readback/status verification | coordinator | local Git plus publisher readback already authorized |

## Agent delivery

Use `repository-explorer` for bounded source mapping and for the fresh local pass that checks CodeQA-derived claims. Author and verifier must be separate invocations when a claim is promoted to independently confirmed evidence.

Use `system-architect` only when process/deployment topology or a cross-boundary flow remains materially ambiguous after ordinary exploration. Use `data-model-architect` only when persistent ownership, cardinality, or transition writers remain materially ambiguous. Both reconstruct existing behavior; they do not recommend redesigns.

Give each agent the physical repository root, exact caller-supplied `artifact_root`, source fingerprint, bounded question, applicable instructions, expected claim records, and read-only stop conditions. Workers return content or write only their assigned staging file beneath the artifact root. The coordinator reconciles and publishes.

## CodeQA route

Native CodeQA MCP is the sole transport for every new task, continuation, and recovery. Require `ask`, `continue_task`, `get_task`, `get_task_logs`, `cancel_task`, `health`, and `list_conversations`, with a healthy `health` check. MCP calls inherit runtime identity: never request, discover, or pass a desktop auth token, user ID, email, a service auth token, or CLI credential.

If MCP is unavailable, unhealthy, or missing an operation required for this workflow, preserve the repository and CodeQA state, record the exact Phase 3 blocker, and stop before interrogation. Do not select a CLI/Desktop-token fallback or request credentials.

If the provider cannot be reached for this repository at all — the MCP surface is not provisioned in this environment, or it is healthy but cannot reach this repository so no task can exist — no lineage is owed. Attest it once with `codeqa-unavailable --cause <mcp-surface-absent|repository-not-accessible> --evidence-id <id> --reason <text>`, then continue through the ordinary gates; `codeqa-convergence` reports `mode: codeqa-unavailable` and the repository completes normally. The attestation is refused whenever a task or round is already recorded, or while a dispatch intent is unresolved, so a failed or cancelled interrogation can never be relabelled as an unreachable provider.

Use one native-MCP lineage per repository. Before each start, continuation, or recovery, finalize bytes containing a unique intent ID, hash them, persist `codeqa-reserve`, dispatch once, then immediately bind the returned task with matching `--intent-id`. Use expected generation 1 for start, current for continuation, and current plus one for recovery.

On re-entry, `codeqa-status` exposes both task and intent. An unbound intent forbids another dispatch and blocks convergence/Phase 3 completion. Reconcile through `list_conversations` plus exact task/log inspection. Bind one exact match without dispatch; missing/ambiguous lookup remains blocked. Only provider-proven absence plus explicit user authorization may clear it as `no-task-created` through `codeqa-resolve-intent`. This is fail-closed, at-most-one automatic dispatch, not exactly-once provider execution.

For a persisted MCP task, use `get_task` and `get_task_logs` before any state-changing operation. Wait and poll the same task while it is `CREATED`, `PENDING`, or `RUNNING`. When it is `COMPLETED`, checkpoint any unrecorded result once and use `continue_task` only for a subsequent successful, source-backed gap question. A `FAILED` task requires log inspection and the documented user recovery choice; a `CANCELLED` task is terminal. Neither state authorizes automatic continuation, retry, or replacement.

A pre-existing legacy CLI task is the sole exception to MCP-only observation: inspect and poll that exact task read-only under its already-bound transport until terminal so it is neither duplicated nor abandoned. Never use CLI to create, continue, resume, cancel, or recover a task. Preserve its terminal observation as audit evidence. Before a subsequent fresh MCP task, tell the user, `Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed.`

MCP `ask` has no branch field. Include repository, requested branch, and expected commit SHA in every initial MCP prompt and require the agent to report its actual checkout/ref and resolved SHA before substantive claims. Missing, mismatched, or unprovable parity is a recorded mismatch and bounded limitation; do not promote branch-dependent testimony as same-ref evidence. Exact-ref uncertainty never authorizes another transport.

The user's `next`/`continue` invocation authorizes successful, intent-reserved follow-up turns until convergence; it does not authorize recovery from a failed task, resolving a no-task-created intent, or expansion beyond the selected repository.

Every CodeQA prompt prohibits file edits, branches, commits, PRs, target execution, production access, and secret/private-payload collection. Capture task IDs and concise claim summaries, not hidden reasoning or full raw transcripts.

## Downstream command route

For Explainer Pro, load `skills/explainer-pro/SKILL.md` and preserve its opening roadmap, progressive loading, evidence gate, and immutable generations. Invoke COURSE mode with audience FSB and `--no-codemap`; the outer start/continue choice supplies an explicit start choice after its roadmap.

For code mapping, read `commands/workspace-codemap-pro.md` first and preserve its unnumbered outline. Pass an explicit `next` selection for the single repository. Do not import this workflow's phase engine into the codemap command.

## Course publication route

Resolve the runtime `$docs_publisher` skill. Its installed CLI, document schema, grounding rules, theme contract, validation, create/pull syntax, and authentication boundaries are authoritative. Publish an publisher-compatible copy of the immutable course; never weaken or replace the Explainer Pro generation.

## Failure and resume

Persist a blocker with phase, attempted action, exact unavailable prerequisite, and safe next action. Resume from the earliest incomplete phase. Restore a persisted CodeQA task through its bound transport and inspect it before deciding the next lifecycle action. Never reconstruct or replace a missing CodeQA task ID, publisher document ID, Explainer generation, codemap manifest, or baseline digest from prose.
