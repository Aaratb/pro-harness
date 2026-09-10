# Phase 1 — Inventory & Preflight

Establish the complete repository queue and prove every required tool and local-only artifact boundary before long-running study begins.

## Entry

Resolve the physical workspace. Run `node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" status --workspace <workspace>` first; initialize only after an explicit start/continue choice. Merge discovery into existing state without overwriting progress.

Default to the earliest `in_progress` repository, otherwise the first available `pending` repository. An explicit `repo <name>` overrides selection. Keep missing `service-repos.txt` entries as `unavailable`.

For the selected repository, run `node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" contract-status --workspace <workspace> --repo <repo>`. The current workflow and artifact contract versions are both `2`. If `needs_migration` is true, run `node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" contract-migrate --workspace <workspace> --repo <repo>` once. It must preserve the prior details, phase records, and terminal CodeQA state inside its migration audit record; invalidate Phases 2–8; quarantine superseded `DOMAIN-AUTHORITY.md` references; require the canonical `OPERATION-AUTHORITY.md` and `INVARIANTS-AND-FAILURE.md`; and resume at Phase 2.

A legacy CodeQA task reported as `CREATED`, `PENDING`, or `RUNNING` blocks migration. Observe that exact provider task read-only under its original transport until it is terminal, then checkpoint the provider evidence with `node "$HARNESS_ROOT/scripts/workspace-learning-state.mjs" contract-observe-codeqa --workspace <workspace> --repo <repo> --task-id <persisted-current-id> --transport <persisted-mcp|cli> --status <COMPLETED|FAILED|CANCELLED> --evidence-id <immutable-provider-observation-id>`. The `cli` value is legacy-only: that task may be inspected or polled, but never created, continued, resumed, cancelled, or recovered through CLI. Only after terminal evidence is checkpointed may migration continue. If exact identity, transport, or terminal evidence cannot be proved, remain blocked; never discard the identity and start a duplicate. Do not copy a legacy completion or flat CodeQA checkpoint forward as current typed state.

Read workspace and selected-repository `AGENTS.md` files. Record repository root, origin identity without credentials, requested branch, expected HEAD, local status, primary manifests/languages, and whether CodeQA can prove it inspected the same remote ref. Do not print credential-bearing remotes.

## Tool preflight

1. Probe the native CodeQA MCP for exposed `ask`, `continue_task`, `get_task`, `get_task_logs`, `cancel_task`, `health`, and `list_conversations` operations, then call `health`. Native MCP is the sole transport for new tasks, continuations, and recoveries. Its identity is authenticated by the host runtime; never request or pass a desktop auth token, user ID, email, a service auth token, or CLI credential.
2. Record whether the native MCP surface is **provisioned** in this environment at all, separately from whether it is healthy. If the surface is entirely absent, note `codeqa_surface=absent`: this workspace has no CodeQA deployment, Phase 3 will have nothing to reach, and Phase 3 may attest `mcp-surface-absent` rather than blocking. If the surface exists but is unhealthy or lacks a required operation, preserve all repository and CodeQA state and record the exact Phase 3 blocker; a present-but-failing provider is an outcome, not an absent one. In either case do not discover credentials, request a desktop auth token, or select a CLI fallback. Phase 2 always performs its local-only study.
3. Resolve `$docs_publisher`. Check the publisher CLI on `PATH`, then the current user's `.local/bin/`. Run `auth whoami --json`. On auth failure, quote the error and stop without login.
4. Confirm the canonical `explainer-pro` skill and `workspace-codemap-pro` command exist beneath `HARNESS_ROOT`.

Do not begin Phase 2 while a required publication dependency is unavailable. Persist the native MCP capability/health result, any Phase 3 blocker, and requested branch/expected SHA. When MCP is healthy, announce `CodeQA transport: native MCP (sole transport)`. If a pre-existing legacy CLI route was recorded, explicitly say `Workspace Learning Pro has switched to native CodeQA MCP; the legacy CLI task will not be resumed.`

## Artifact preflight

Run the helper's `ensure-ignored` for the selected repository. It may add only the three exact local-exclude patterns from the core contract and must stop if any artifact path contains tracked files.

Then capture the `baseline` porcelain-status snapshot. Persist workspace path, repository path, source fingerprint, requested branch/expected SHA, branch/ref parity state, tool identities, CodeQA transport, artifact roots, and the completed Phase 1 checkpoint.

## Exit

Return the selected repository, queue position, source fingerprint, preflight results, baseline digest, and Phase 2 as the next action.
