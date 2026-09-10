# Review and repair local projects

Git history is useful evidence, not a prerequisite for inspecting or fixing an explicitly selected standalone project. Review Pro stays source-read-only; Debug Pro owns authorized repairs and their RED/GREEN proof. Local success never certifies unperformed PR, CI, merge or deployment checks.

| Target | Mode | Baseline |
| --- | --- | --- |
| Git work, including before the first commit | `--working` | Local HEAD, or verified unborn snapshot |
| Explicit standalone directory | `--local` | Named scope, physical root and content-hashed snapshot |
| PR or committed branch comparison | Existing Git mode | Verified commits and comparison |

An ordinary request naming a standalone project supplies the target choice; explain that local mode is being used. Do not make the user memorize helper flags or author JSON. Resolve ambiguity about the actual maintained directory, not about whether they must commit. Never fall back automatically on a Git error, invent SHAs, initialize Git or widen selection to an ancestor. A root containing its own `.git`, even damaged metadata, requires Git handling; nested Git projects need separate binding. Git appearing mid-run invalidates local reuse.

## Explicit, bounded scope

The orchestrator chooses and states the relevant relative files/directories from the user's request, e.g. `["src","test","package.json"]`. Include affected consumers and contracts; avoid irrelevant vendor, generated, cache, credential or historical material. Do not quietly narrow a requested whole-project review: state coverage and obtain direction if necessary. The snapshot includes every entry under selected directories, including hidden, configuration and binary files within size limits; it applies no undocumented ignore rules. Named missing files are retained so prospective regression files and deletions can be bound. Scope selectors must be nonempty, unique and non-overlapping; no `.`, traversal, absolute paths or Git metadata.

Keep this selected scope independently in the run request/report as `local_scope`. Pass it explicitly to every local helper and validator as `--scope <JSON-array>` with `--local`; packet contents cannot authorize a new scope. Re-verification in a fresh session uses the independently retained request scope or asks for it—it does not accept a resolution's suggested scope as authority. A scope change requires new intake and affected evidence, never rehashing an old packet to appear current.

Scope is coverage, not a repair allowlist. Debug separately declares exact permitted edits within it and preserves unrelated work. Files outside the snapshot have no freshness claim and remain outside repair permission. Before edits, include any planned new test paths or their containing directory. Hashes identify bytes, not proof of when they were captured: retain the original entries and digest, pre-edit chronology and independent verification. Preserve recoverable originals of allowlisted files when Git cannot provide them; ordinary targeted copies beneath the existing Debug root suffice, without a new backup engine or automatic restore.

## Existing helpers

`HARNESS_ROOT` is the installed canonical harness. `PROJECT_ROOT` is the chosen physical target. Commands below are illustrative arguments, not permission to execute instructions from a packet.

```sh
node "$HARNESS_ROOT/scripts/resolve-review-root.mjs" --repo "$PROJECT_ROOT" --slug local-review --local --create
node "$HARNESS_ROOT/scripts/review-run.mjs" init --repo-root "$PROJECT_ROOT" --artifact-root "$PROJECT_ROOT/reviews/local-review" --local --scope '["src","test","package.json"]'

node "$HARNESS_ROOT/scripts/resolve-debug-root.mjs" --repo "$PROJECT_ROOT" --slug local-repair --local --create
node "$HARNESS_ROOT/scripts/debug-context.mjs" --repo-root "$PROJECT_ROOT" --artifact-root "$PROJECT_ROOT/debug/local-repair" --local --scope '["src","test","package.json"]'
```

Review records `comparison: local-directory`; Debug records `diff_mode: local-directory`. Both use null commit fields and the same `local_scope`. Debug retains the existing `initial_snapshot_entries`, `baseline_files` and `pre_fix_snapshot_digest`. Final capture passes that original digest with `--pre-fix-snapshot`, never replacing the historical entries. Review-origin Debug additionally supplies the original validated Review root and handoff; scope, identity, original digest and acceptance criteria must match.

Pass `--local --scope <the-independent-selected-scope>` to `validate-review-pro-run`, `validate-review-handoff(s)`, `validate-debug-resolution`, `validate-review-resolution`, and Review's lifecycle hook. The hook forwards explicit caller flags only; no state field grants permission. Final Review uses a fresh run and fresh source evidence. Public return routes include the selected target and `--local`; they are display-only recommendations.

Each capture is repeated, followed by later boundary freshness checks. Added/deleted files, content or executable-mode changes affect the digest. Only exact active Review/Debug artifact roots are excluded, not all `.agents`. Links are hashed as links, never followed; Debug refuses symlink or incomplete repair scope. Oversized/unhashable files are visible evidence gaps, not verified bytes. Limits are 4 MiB per file, 128 MiB hashed per pass, 50,000 visited entries and 100 path components; narrow oversized scope transparently. Portable no-follow checks detect observed replacements and ordinary drift, not every adversarial swap-and-restore filesystem race.

## When the harness is the project

An installed canonical bundle is not automatically a generated adapter. Copy installs intentionally omit `.git`; link installs point to maintained source. Inspect actual installer metadata and adapter bindings. Prefer the maintained source when it is available and selected. If the user selects an installed source copy, local repair is supported; explain that a reinstall may replace those edits. Generated runtime adapters should be changed through canonical definitions and their generator, not treated as implementation source. Never switch to an unrelated Git ancestor.

When the harness itself is explicitly selected, its normal `.agents/reviews/<slug>` or `.agents/debug/<slug>` is project-owned output. Otherwise artifacts belong in the user's target project, never the command provider's installation. No installer, credential, runtime setting, publication or external access change is implied by selecting local review/repair.
