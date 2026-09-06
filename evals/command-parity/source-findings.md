# Command parity: source-backed findings

Maintainer-only audit notes. These are findings, not runtime instructions or approval to change production code.

## Feature Pro routing verifier — confirmed harness compatibility defect

**Observed run:** `/private/tmp/pro-parity-audit.1Lnfhp/installed-v1/feature-small-codex-1`.

**Freeze:** `/private/tmp/pro-parity-audit.1Lnfhp/freeze.json`, created 2026-09-05T22:51:13.433Z. The current main command, canonical skill, runtime-adapter generator, routing verifier, and installed Claude/Codex Feature wrappers all matched their frozen SHA-256 values during this investigation.

### 1. Root binding does not reach the verifier

- `scripts/verify-feature-pro-routing.sh:4-5` selects `AGENTS_HOME`, otherwise `$HOME/.agents`. It does not consume `HARNESS_ROOT` or derive its canonical root from the invoked script location.
- `scripts/lib/runtime-adapters.mjs:30-38` binds the selected installation as `HARNESS_ROOT` and instructs replacement of the whole canonical `~/.agents` prefix. It explicitly says this variable is not exported automatically.
- `skills/feature-pro/SKILL.md:32-34` gives a bare verifier invocation, without an `AGENTS_HOME` override. `docs/installation.md:15` likewise documents `HARNESS_ROOT`, not this different variable.
- The installed Codex wrapper correctly binds `/Users/aaratbhatnagar/.pro-harness/current` at lines 6-12. The live `current` symlink points to Pro-harness; the retained `~/.agents` symlink points to the historical harness. Those are distinct, intentionally coexisting installations.

Calling the correctly located verifier is therefore insufficient to select that installation's canonical command. Not exporting the undocumented `AGENTS_HOME` cannot be treated as an actor-only violation.

### 2. Verifier assumes the obsolete direct-command-symlink layout

- `scripts/verify-feature-pro-routing.sh:19-28` requires each Claude/Cursor command's resolved filesystem path to equal the canonical command's resolved filesystem path.
- The supported installer instead links runtime entries to generated thin wrappers: `scripts/install.mjs:48-60`; wrapper generation occurs in `scripts/lib/runtime-adapters.mjs:113-124,227-232`.
- A valid wrapper is a different file that explicitly reads the canonical command. File identity is consequently the wrong routing predicate.
- The verifier also does not inspect Codex's skill entry at all, despite being suggested by the canonical Codex-facing Feature skill.

Read-only reproduction against the unchanged installation:

| Invocation binding | Selected canonical | Result |
|---|---|---|
| No override | Historical `~/.agents/commands/feature-pro.md` | Exit 1: generated Claude wrapper is a different file |
| `HARNESS_ROOT=/Users/aaratbhatnagar/.pro-harness/current` | Historical command again | Exit 1: advertised binding is ignored |
| `AGENTS_HOME=/Users/aaratbhatnagar/.pro-harness/current` | Pro-harness command | Exit 1: valid generated wrapper still fails realpath equality |

These runs only resolved/read existing files. No home configuration, symlink, source or runtime adapter was changed.

### Native-run evidence and separate contributors

- `turn-1/events.jsonl:5`: actor invoked the literal correct `current/scripts/verify-feature-pro-routing.sh`, without `AGENTS_HOME`; the command returned the historical canonical path and generated Claude adapter mismatch. This matches the independent reproduction.
- `turn-1/events.jsonl:6`: actor disclosed the mismatch and continued using the wrapper-designated canonical contract, treating the verifier as degraded setup evidence. The observed final workflow stop was not solely this verifier.
- `turn-0/events.jsonl:6-9`: after reading the correct installed wrapper, the actor incorrectly expanded `~/.agents/commands/feature-pro.md` to `current/.agents/commands/feature-pro.md`. The wrapper says to replace the whole prefix, not append `.agents`. It recovered and read `current/commands/feature-pro.md` at line 17. This is observed actor interpretation/recovery overhead, not evidence that the canonical command is absent or that the evaluator supplied the bad path.
- `turn-1/invocation.json` records `approval_policy="never"` with workspace-write sandboxing. `turn-1/events.jsonl:15-16` records the actor's artifact-write denial/retry and final blocked response. The parent audit identified the evaluator's session permission profile as a separate issue; the profile correction is not a source fix and does not erase this retained attempt.
- The original `turn-0/user.txt` invokes `$feature-pro` and permits only the synthetic repository and relevant installed dependencies. It does not prescribe `current/.agents`, override root resolution, or authorize live home repairs.
- The actor calls the verifier “mandatory,” whereas the canonical skill says **when checking installation or routing**. That conditional check should not silently become a new per-run hard gate. It did not become the terminal gate in this observed attempt.

### Coverage gap and bounded recommendation

`tests/feature-pro-import.test.js:42-49` checks that the skill mentions the verifier, not that the verifier accepts installed wrappers. Existing installer tests exercise wrapper/link generation; the searched test suite contains no direct invocation of this routing verifier.

A later authorized fix should align root selection with the documented binding and validate supported wrapper-to-canonical routing rather than file identity, including Codex and custom/coexisting installations. Keep the fix scoped; do not repoint historical `~/.agents`, copy command bodies into wrappers, or add installation repair to ordinary feature work.

**Classification:** confirmed deterministic harness verifier defect; separate observed actor prefix-mapping mistake; separate evaluator permission limitation. No inference about Feature Pro's completed product quality follows from this blocked run.
