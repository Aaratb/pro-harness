# Architecture Pro run lifecycle

Architecture Pro keeps resumable state in `state.json` and an append-only execution trace in `run-events.jsonl`. Validators and the `before-phase-transition` hook require that packet. They do not create it.

## Fresh run

After target, mode, and authority are established:

```bash
node "$HARNESS_ROOT/scripts/resolve-architecture-root.mjs" \
  --repo <target-path> --slug <architecture-slug>

node "$HARNESS_ROOT/scripts/architecture-run.mjs" initialize \
  --repo <target-path> \
  --slug <architecture-slug> \
  --mode DESIGN|AUDIT|MIXED|ADR_ONLY
```

`initialize` resolves a contained repository-owned `.agents/architecture/<slug>` root (or the project-owned `architecture/<slug>` root in a declared workspace), creates a new run ID, writes schema-valid `state.json`, and records present-time `run-started` and `phase-started` events. It refuses an already-occupied root. Never hand-write `state.json` or backfill trace history.

Replace `$HARNESS_ROOT` with the resolved active installation. Runtime adapters may still spell that path as `~/.agents`.

Optional flags: `--title <title>`, `--initiative <name>`, `--repos <path,path>` for additional read-only evidence repositories.

## Occupied root / legacy trace without state

If the slug already contains `state.json`, `run-events.jsonl`, a continuation trace, or a recovery manifest, `initialize` fails closed. Do not place a new run ID into that root.

Response for callers:

1. Choose a **new slug**.
2. Run `initialize` against the new slug.
3. Keep the previous root byte-for-byte.
4. Reverify prior architecture artifacts as untrusted evidence in the new run.
5. Do not mark imported or previously observed phases as passed, waived, or certified.
6. Phase 10 (and every later hard gate) stays unreachable until the fresh run legally progresses and required lane/approval bindings pass.

There is no silent reconciler that converts a narrative packet into governed run history.

## Validation

```bash
node "$HARNESS_ROOT/scripts/validate-architecture-pro-run.mjs" \
  --repo-root <repository-or-project-root> \
  --artifact-root <architecture-relative-root>

node "$HARNESS_ROOT/scripts/validate-workflow-trace.mjs" \
  --artifact-root "$ARCHITECTURE_ROOT" \
  --workflow architecture-pro \
  --run-id <run-id>

node "$HARNESS_ROOT/scripts/run-workflow-hook.mjs" \
  --workflow architecture-pro \
  --event before-phase-transition \
  --repo-root <repository-or-project-root> \
  --artifact-root <architecture-relative-root>
```

Use the same hook before run completion with `--event before-run-completion`. Append later events only through `scripts/record-workflow-event.mjs`.
