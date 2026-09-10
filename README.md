# Pro Harness

Pro Harness is a runtime-neutral agent harness for evidence-backed feature delivery, architecture work, production review, defect resolution, and repository learning. Its canonical commands, skills, agent contracts, MCP capability contracts, schemas, and scripts are installed once under `~/.agents`; thin adapters expose them to Claude Code, Codex, and Cursor.

## Public commands

| Workflow | Claude / Cursor | Codex |
|---|---|---|
| Pro-level feature delivery | `/feature-pro` | `$feature-pro` |
| Pro-level architecture design and audit | `/architecture-pro` | `$architecture-pro` |
| Evidence-led outcome assessment | `/outcome-pro` | `$outcome-pro` |
| Evidence-led customer research | `/customer-backward-pro` | `$customer-backward-pro` |
| Pro-level production review | `/review-pro` | `$review-pro` |
| Pro-level roadmap development | `/roadmap-pro` | `$roadmap-pro` |
| Pro-level defect resolution | `/debug-pro` | `$debug-pro` |
| Pro-level repository learning | `/explainer-pro` | `$explainer-pro` |
| Workspace-wide repository learning | `/workspace-learning-pro` | `$workspace-learning-pro` |
| Repository and workspace code maps | `/workspace-codemap-pro` | `$workspace-codemap-pro` |

Feature Pro writes into `.agents/features/<feature-slug>/`, Architecture Pro into `.agents/architecture/<architecture-slug>/`, Review Pro into `.agents/reviews/<review-slug>/`, Debug Pro into `.agents/debug/<debug-slug>/`, and Explainer Pro into `.agents/explanations/<explanation-slug>/` inside the active repository. Harness installation files remain under `~/.agents`.

Feature Pro keeps product telemetry separate from its own append-only execution trace, starts from an approved business goal and product solution, plans library reuse before custom code, verifies built UI/API surfaces with safe sample data and intended-versus-observed sequence diagrams, and activates additional evaluation and hardening only for AI products.

Architecture Pro supports audit, design, mixed, and focused decision modes across 13 progressively loaded phases. It defaults to static analysis, routes evidence-backed specialist lanes through read-only capability profiles, consolidates security review into explicit focus contracts, requires bounded consent for external or live access, and emits a digest-bound handoff that Feature Pro can verify.

Review Pro is a source-read-only production reviewer with ten progressively loaded phases and targeted capability routes. Its only write enclave is the repository-local review artifact root, which is excluded from its own diff evidence. It authenticates findings, runs consolidated security and production challenges, emits honest five-slot production risks, and creates digest-bound Debug Pro handoffs without diagnosing or applying fixes. Fast mode consolidates human reporting into `CODE_REVIEW.md` while retaining findings, risk records, applicable evidence, and its restricted verdict.

Use `/review-pro --working` (Claude) or `$review-pro --working` (Codex) to review local work before publishing. Existing repositories compare against local `HEAD`, without an upstream; before the first commit, eligible working files and index entries form a content-hashed snapshot. No commit or push is required. Source edits invalidate stale evidence. Local reviews and Debug handoffs retain their normal depth and safety gates, but local success does not certify unperformed PR/CI or merge readiness. Files outside Git's eligible inventory remain outside scope; unhashable files are explicit evidence gaps, never verified coverage.

Standalone projects without Git—including an explicitly selected canonical harness copy—use `review-pro <directory> --local` or `debug-pro <directory> --local`. They share a bounded content snapshot and preserved scope through repair/re-verification. Review remains read-only; Debug requires its normal repair proof. See [Local review and repair](docs/local-review-debug.md).

Explainer Pro provides one public command with eight progressively loaded phases and named `--capability` routes. It creates an evidence-grounded repository course, feature and change traces, system views, reference material, diagrams, and comprehension practice as immutable repository-local HTML and Markdown generations. Related capabilities can publish in one atomic batch, retaining unchanged verified evidence. Its deterministic helpers use the existing Node runtime; the target source is never executed, graded, fixed, or modified.

The course is a visual field guide: readable chapters, rendered diagrams beside their mechanism, expandable evidence, diagram enlargement, and comprehension feedback. Supported Mermaid renders locally with a bundled renderer—no browser download, network call, or package installation. Unsupported diagrams remain visibly partial and cannot be certified as finished visuals. See [Explainer visuals](docs/explainer-visuals.md) for scope, fallback, and verification limits.

Workspace Learning Pro inventories a workspace and studies each repository through local source plus one resumable CodeQA conversation. Native CodeQA MCP is the sole transport for new tasks, continuations, and recoveries and uses runtime identity; the workflow never requests a desktop auth token. Every dispatch is preceded by a prompt-hash-bound intent reservation, providing fail-closed, at-most-one automatic dispatch rather than claiming exactly-once provider execution. An unresolved intent is reconciled through native conversation/task lookup before any retry. A pre-existing legacy CLI task may be observed read-only only until terminal so it is neither duplicated nor abandoned, after which the workflow explicitly switches to MCP. Learning is operation-specific: the workflow records authority and dispatch gates, state/side-effect timelines, uncertain remote outcomes, retry exhaustion, recovery ownership, evidence-class limits, and bounded negative searches before two distinct reconciled no-novelty rounds can converge. Ignored `OPERATION-AUTHORITY.md` and `INVARIANTS-AND-FAILURE.md` dossiers feed—but never replace—the independent Explainer Pro and Workspace Codemap Pro evidence gates.

Debug Pro preserves thirteen ordered investigation stages with adaptive depth: routine defects use a short feedback loop; ambiguous or high-risk failures load additional evidence and causal guidance on demand. It reuses existing agents, MCP capabilities, Git/evidence validation, and the Review resolution contract. Default outputs are `DEBUG_REPORT.md`, shared `run-events.jsonl`, and `resolution.json` for repair attempts. A local resolved claim requires matching RED/GREEN, fresh original reproduction, relevant broader checks and independent code review; it is not a merge verdict. No separate state/ledger schema family or new provider is required.

Customer Backward Pro works backward from customer evidence through eight adaptive phases, sixteen focused methods and two read-only research roles. Use `--phase` or `--capability` for a narrow question; it does not run every method. Chat-only work needs no project setup. Saved work uses `<selected-project>/.agents/research/<study-slug>/research.md` and the shared execution trace; an explicitly selected non-Git project is supported. Firecrawl and Exa are reused only for authorized public research. No customer outreach, warehouse execution, recording, publication or automatic product build is included. See [Customer research](docs/customer-research.md) for scope and verification limits.

Roadmap Pro connects supplied goals and evidence to backlog choices, priority advice, independent challenge, human selection, concise Product Notes and a provisional execution view. Seven phases route six deep methods through two read-only agents; existing Customer methods are reused only for a consequential upstream question. Product Notes cover the full current reviewed scope, including nonselected features. Chat-only work requires no setup; saves belong to `<selected-project>/.agents/roadmaps/<roadmap-slug>/roadmap.md` with shared tracing and an optional static HTML companion. No separate approval store, state engine, review application, new provider or automatic downstream execution is included. Human decisions remain distinct from advice and saved reports.

The reusable GTM foundation currently ships as five standalone skills: mandate, product truth, buying system, launch audience, and measurement design. They work from supplied context and evidence, preserve customer and business uncertainty, and do not authorize targeting, outreach, analytics installation, product changes or launch activity. Their ten frozen synthetic cases and rubric live under `evals/gtm-pro/foundation-v1/`; these are regression fixtures, not customer research or runtime-parity proof. A public GTM Pro command is not exposed yet.

## Requirements

- macOS or Linux
- Node.js 20 or newer
- At least one supported runtime: Claude Code, Codex, or Cursor
- `npx` for the bundled stdio MCP provider configurations
- Provider credentials exported in the installing process when configuring an authenticated MCP

## Install

Run a non-mutating preflight first:

```bash
node scripts/install.mjs --dry-run
```

Install the canonical harness and all three runtime adapters:

```bash
node scripts/install.mjs
```

Install only selected runtimes:

```bash
node scripts/install.mjs --runtimes claude,codex
```

The installer is a zero-dependency Node script: it copies or links the canonical bundle, generates only thin runtime-specific agent/command metadata, and creates per-item symlinks. It does not ask a model to recreate harness structure during installation. It refuses to overwrite unmanaged files. An existing managed `~/.agents` installation is moved to a timestamped backup before an update.

Use `--mode link` when `~/.agents` should point directly to the checked-out Pro Harness source; machine-generated adapters are kept outside the checkout.

See [Installation](docs/installation.md) for layout, conflict recovery, updates, and verification.

## MCP providers

Provider definitions are credential-free in `mcps/providers.json`. Configure the default local providers after exporting required credentials:

```bash
export FIRECRAWL_API_KEY="<your key>"
node scripts/configure-mcps.mjs --providers firecrawl,playwright,mermaid
```

The configurator merges into Claude and Cursor JSON files and a clearly delimited managed block in Codex TOML. It refuses provider-name collisions and writes configuration files with user-only permissions. See [MCP configuration](docs/mcp-configuration.md).

## Validate

```bash
npm test
```

The suite validates the pro workflows, architecture and Review/Debug handoff integrity, Explainer Pro generation atomicity and HTML safety, agent and skill resolution, workflow trace privacy and sequence integrity, MCP contracts, generated adapters, secret handling, and clean installation into an isolated temporary home. See [Workflow efficiency](docs/workflow-efficiency.md) for progressive loading, trace-only recovery, and measurement boundaries.

## Repository map

```text
commands/    Public workflows and progressively loaded phase contracts
skills/      Canonical reusable skills
agents/      Runtime-neutral definitions, profiles, overlays, and capabilities
mcps/        Capability contracts and provider configurations
schemas/     Cross-workflow artifact schemas
scripts/     Installer, generators, resolvers, and validators
hooks/       Runtime-neutral lifecycle gates and their registry
adapters/    Runtime manifest, adapter source, and generated-install destination
tests/       Deterministic and scenario-level regression tests
docs/        Installation and operation documentation
```

Third-party attribution notices for adapted material are retained in `NOTICE.md`; those names are not runtime namespaces.
