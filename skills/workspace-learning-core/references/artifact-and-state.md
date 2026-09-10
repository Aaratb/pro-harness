# Artifact and state contract

## Canonical paths

Use one coordinator state root and three repository-owned artifact roots:

```text
<workspace>/.workspace-learning/
└── state.json

<repo>/.agents/repository-learning/
├── README.md
├── LOCAL-STUDY.md
├── OPERATION-AUTHORITY.md
├── INVARIANTS-AND-FAILURE.md
├── EXTERNAL-INTERROGATION.md
└── CONVERGENCE.md

<repo>/.agents/explanations/<course-slug>/
└── Explainer Pro immutable generations

<repo>/.codemaps/
└── Workspace Codemap Pro artifacts
```

The workspace state does not establish repository truth. It records queue, resumability, identities, artifact references, and verification results.

## Contract version and resume

The canonical workflow contract and artifact contract are version `2`. Before Phase 2 or any later resume, run:

```text
node <HARNESS_ROOT>/scripts/workspace-learning-state.mjs contract-status --workspace <workspace> --repo <name>
```

When `needs_migration` is true, run `contract-migrate` for that exact repository. Migration is an auditable invalidation, not evidence conversion: it preserves the old details, Phase 2–8 checkpoints, and terminal CodeQA state under the migration record; quarantines superseded `DOMAIN-AUTHORITY.md` references; marks Phases 2–8 pending; and requires a Phase 2 restudy under the current artifact set before any later phase can checkpoint.

A legacy CodeQA task in `CREATED`, `PENDING`, or `RUNNING` blocks migration. Observe the exact task read-only through its original provider until terminal, then call `contract-observe-codeqa --workspace <workspace> --repo <name> --task-id <persisted-current-id> --transport <persisted-mcp|cli> --status <COMPLETED|FAILED|CANCELLED> --evidence-id <immutable-provider-observation-id>`. The `cli` transport value is accepted only for the identity of a pre-existing task: inspect or poll it, but never create, continue, resume, cancel, or recover through CLI. This command is available only before a required migration, accepts only the exact persisted identity/transport and a terminal observation, and records auditable evidence; it does not call CodeQA. If those facts are unprovable, stay blocked. A current Phase 2 completion must replace stale active paths/digests and provide 64-hex SHA-256 details named `local_study_digest`, `operation_authority_digest`, and `invariants_failure_digest` that the helper verifies against the three canonical regular, no-follow files. Missing or future versions fail closed.

Persist dispatch intent reservation before any external MCP start, continuation, or recovery. An intent remains durable until a matching task is bound or provider-proven absence is explicitly resolved; while unbound it blocks another dispatch, convergence, and Phase 3 completion. Preserve archived intent and lookup evidence in state rather than inferring task identity from prose.

If the workspace itself is a Git root, queue initialization may append only `/.workspace-learning/` to that root's local Git `info/exclude`. A tracked `.workspace-learning` path blocks initialization. This coordinator-state exclusion is distinct from the per-repository exclusions below.

## Local-only Git contract

Before any repository artifact write, run:

```text
node <HARNESS_ROOT>/scripts/workspace-learning-state.mjs ensure-ignored --workspace <workspace> --repo <name>
node <HARNESS_ROOT>/scripts/workspace-learning-state.mjs snapshot --workspace <workspace> --repo <name> --label baseline
```

For the selected repository, the helper may append only:

```text
/.agents/explanations/
/.agents/repository-learning/
/.codemaps/
```

to the repository's local Git `info/exclude`. Do not edit `.gitignore`, add a broad `/.agents/` pattern, or hide any tracked path. If `git ls-files` finds a tracked artifact path, stop before writing and ask the user to resolve ownership.

The baseline is captured after local excludes are installed. Existing porcelain entries belong to the user and remain part of the digest. Final verification must match exactly; never clean, reset, stash, or discard source to make it pass.

## Queue and selection

Discover immediate-child physical Git roots only. When `service-repos.txt` exists:

1. retain each declared name in file order and mark missing/non-Git entries unavailable;
2. append unlisted immediate-child Git roots alphabetically;
3. exclude the workspace root and symlinked children.

Initialization is merge-only. Preserve existing phase records, blockers, outputs, and completed repositories. A fresh discovery may add repositories or change availability; it never deletes a prior record.

Selection order is earliest `in_progress`, then earliest available `pending`. A `blocked` repository remains the active blocker and prevents automatic completion/advance unless the user explicitly resolves or skips it.

## Checkpoint fields

Persist, at minimum:

- workspace/repository physical paths and discovery source;
- availability, repository status, current phase, phase statuses and notes;
- workflow/artifact contract versions, migration audit, and any Phase 2 restudy requirement;
- source fingerprint, branch, remote-ref parity, baseline snapshot;
- CodeQA MCP health/capabilities, dispatch intent ID/kind/prompt SHA-256/expected generation/parent or recovery source, intent resolution evidence, task ID and lineage, latest status, result checkpoint, recovery generation, round count, novelty window, requested branch/SHA, and reported checkout/ref parity;
- per-operation authority/gate/fallback map, state/side-effect timelines, failure/recovery matrices, evidence-class limits, and bounded negative-search scope;
- convergence result and residual unknowns;
- Explainer root/generation/course digest;
- publisher document ID/URL and pulled validation digest;
- codemap root/manifest/source/rendering/integrity result;
- final status verification and completion timestamp.

Use `scripts/workspace-learning-state.mjs` for inventory, initialization, status, selection, checkpoints, exact local excludes, snapshots, and verification. Write state atomically with user-only permissions.

## Refresh

Compare current instructions, HEAD, dirty/untracked source, manifests, and cited evidence with the stored fingerprint. Invalidate affected claims and their dependent course/codemap sections only. Same timestamp or HEAD alone does not prove freshness; an older artifact alone does not prove staleness.
