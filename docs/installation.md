# Installation

## Installation model

The chosen installation target (default `~/.agents`) is the installed source of truth. The installer does not copy full workflow bodies into each runtime:

- Claude and Cursor receive thin command and skill wrappers plus generated Markdown agents.
- Codex receives generated TOML agents and adapter-owned skill directories with UI metadata. Commands are invoked as skills because Codex discovers `SKILL.md` workflows.
- Every runtime entry is a per-item symlink, allowing unrelated personal commands, skills, and agents to coexist.

Installation is deliberately mechanical and lightweight: the scripts use only Node.js built-ins, generate adapter metadata from canonical definitions, and perform no model calls, package installation, or remote fetches.

Canonical skills never contain generated `agents/openai.yaml` files. Codex-specific metadata is created only inside generated adapter output.

Every generated entry binds `HARNESS_ROOT` to the chosen target, including custom paths with spaces. The binding instructs the runtime to resolve canonical `~/.agents` references and shell examples against that target, and to pass it to delegated agents. It does not export a shell variable automatically or change repository-owned artifact locations. Canonical command and skill bodies remain unchanged.

To preview adapters without installing anything, run `npm run adapters:generate`. It writes only the managed, Git-ignored `adapters/generated/` directory, using `~/.agents` as the default binding. Regeneration preserves an existing managed output's root binding. Installed adapters are generated separately by the installer with the selected target.

## Preflight

From the cloned Pro Harness directory:

```bash
node scripts/install.mjs --dry-run
```

Preflight fails when:

- `~/.agents` is non-empty but is not marked as a Pro Harness installation;
- a runtime already owns an entry with the same name;
- a legacy whole-directory symlink such as `~/.claude/agents -> ...` prevents safe per-item installation; or
- an unsupported runtime is requested.

Resolve the exact reported conflict and rerun. The installer never deletes or replaces an unmanaged runtime entry.

## Install or update

```bash
node scripts/install.mjs --runtimes claude,codex,cursor
```

Options:

| Option | Meaning |
|---|---|
| `--home <path>` | Runtime home used for isolated testing or a non-default user home |
| `--target <path>` | Canonical installation root; defaults to `<home>/.agents` |
| `--mode copy\|link` | Copy into the target (default) or link the target to the checked-out source |
| `--runtimes <csv>` | Any subset of `claude,codex,cursor` |
| `--mcp-providers <csv>` | Configure selected providers during installation |
| `--dry-run` | Validate targets and conflicts without writing |

On update, the current managed installation is moved to `<target>.backup-<timestamp>`. Keep the backup until the new installation has been exercised, then remove it manually.

For contributors who want edits in the checkout to become immediately available, use `--mode link`. Generated runtime files then live under `~/.pro-harness/runtime-adapters`, keeping machine-specific output out of the source tree:

```bash
node scripts/install.mjs --mode link
```

Link mode refuses to replace an existing `~/.agents` link that targets another harness. Move that link aside explicitly before migrating; the installer does not guess that the old target can be discarded. It also refuses to rebind shared generated adapters to a different target; reuse the existing target or choose an isolated `--home`.

To keep another harness active, leave its root in place and choose a separate target, for example `--mode link --target "$HOME/.pro-harness/current" --runtimes claude,codex`. First inventory and back up only conflicting runtime entries outside discovery. Whole-directory runtime links need explicit conversion to per-item links so unrelated entries remain available. Never modify the historical source through those links. The installer deliberately leaves this ownership decision to the operator.

For Codex, same-named skills in multiple roots can both appear. Disable only replaced source paths using documented `[[skills.config]]` entries (`path = "/absolute/path/to/skill/SKILL.md"`, `enabled = false`); keep unrelated skills enabled. Restart and verify discovery. Do not disable an entire legacy catalog to resolve a few collisions. See [Codex skill discovery and configuration](https://learn.chatgpt.com/docs/build-skills).

When upgrading the codemap command name, the installer replaces only old runtime symlinks whose exact targets and previous generated manifest identify them as Pro Harness-owned. Personal files and unrelated links remain untouched. If another runtime still has that old managed command, preflight asks you to include it in the update. No workflow content is deleted.

## Runtime discovery

Restart the selected runtime after installation. Then verify:

- Claude or Cursor shows `/architecture-pro`, `/customer-backward-pro`, `/debug-pro`, `/explainer-pro`, `/feature-pro`, `/outcome-pro`, `/review-pro`, `/workspace-codemap-pro`, and `/workspace-learning-pro`.
- Codex discovers `$architecture-pro`, `$customer-backward-pro`, `$debug-pro`, `$explainer-pro`, `$feature-pro`, `$outcome-pro`, `$review-pro`, `$workspace-codemap-pro`, and `$workspace-learning-pro`.
- A named canonical agent such as `code-reviewer` is discoverable.
- Invoking Feature Pro writes state below the active repository's `.agents/features/` directory, never beside the harness installation.
- Invoking Architecture Pro writes state below the active repository's `.agents/architecture/` directory, never beside the harness installation. Fresh runs use `scripts/architecture-run.mjs initialize`; see `docs/architecture-pro-lifecycle.md`.
- Invoking Explainer Pro writes state below the active repository's `.agents/explanations/` directory, never beside the harness installation.
- Invoking Review Pro writes evidence below the active repository's `.agents/reviews/` directory while leaving reviewed source and configuration unchanged.
- Invoking Outcome Pro uses chat for a simple check or a fresh owning repository's `.agents/outcomes/<run-id>/` for saved assessments; it creates no phase-state engine.
- Invoking Customer Backward Pro uses chat or the selected project's `.agents/research/<study-slug>/`; non-Git projects require explicit selection. Its workers remain read-only. Importing its canonical files alone does not refresh existing runtime discovery; install/update separately when ready.
- Invoking Workspace Learning Pro resolves the adapter-provided `HARNESS_ROOT`, keeps workspace state under `.workspace-learning/`, and writes repository learning artifacts only below each repository's ignored `.agents/repository-learning/`, `.agents/explanations/`, and `.codemaps/` roots.

## Installation safety

- The source bundle contains no provider credentials.
- MCP credentials are read from the installer process only when MCP configuration is requested.
- Runtime configuration files are written with user-only permissions.
- Existing MCP providers with the same name are never overwritten.
- The installer reports `status`, `summary`, `next_actions`, and `artifacts` for deterministic recovery.
