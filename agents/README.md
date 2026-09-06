# Agents

Pro Harness uses one flat set of runtime-neutral canonical agent names. Agent
definitions do not contain Claude, Codex, Cursor, vendor, team, or legacy
namespace names.

## Contract layers

1. `definitions/*.json` describes a role, its capability profile, required
   inputs, artifact policy, source mapping, and focused instructions.
2. `contracts/base-agent-contract.md` supplies behavior shared by every agent.
3. `capability-profiles.json` limits repository, terminal, artifact, and
   external access by role.
4. `adapters/capabilities.json` maps canonical capabilities to runtime tool
   names. Claude's `Read`, `Grep`, `Glob`, `Bash`, `Write`, and `Edit` names live
   here rather than in canonical definitions.
5. `rename-manifest.json` records how source agents were retained, rewritten,
   or merged.

## Artifact root

Every invocation must supply `artifact_root`, resolved inside the active
repository. Reports may be written only beneath that root. A write-capable
agent may additionally edit task-scoped repository files, but it may not invent
another output directory or escape the supplied root.

## Skills and overlays

Agent skill dependencies use flat canonical names and must resolve through the
shared skill manifest. Stack-specific behavior is attached only through an
evidence-gated overlay; overlays cannot widen the agent's capability profile.
Unresolved dependencies and unrecognized overlay routes fail validation.

## Validation

From the directory containing `Pro-harness`:

```sh
node Pro-harness/scripts/validate-agent-catalog.mjs
node --test Pro-harness/tests/*.test.js
```
