# MCP configuration

## Provider catalog

`mcps/providers.json` contains executable provider definitions and their canonical capability coverage:

| Provider | Default | Capabilities | Authentication |
|---|---:|---|---|
| `firecrawl` | Yes | Search, scrape, crawl, extract, map, deep research | `FIRECRAWL_API_KEY` |
| `exa` | No | Search, page fetch, advanced search with bounded subpage crawling | Hosted public access; limits/authentication may apply |
| `playwright` | Yes | Browser navigation, inspection, interaction, capture | None |
| `mermaid` | Yes | Diagram rendering | None |
| `vercel` | No | Deployment and observability inspection | Provider OAuth |

The catalog contains environment-variable names, never their values. Stdio package versions are pinned in this release so installation does not silently change behavior; update them only with provider-specific validation. Optional providers are not enabled merely because they exist.

Explainer Pro's publisher includes a local renderer for ordinary flowchart, sequence, UML class, ER, and state diagrams. These need no MCP setup. The existing `diagram.render` capability remains available for unsupported notation or an already configured renderer; it must return a local SVG without external publication. See [Explainer visuals](explainer-visuals.md).

## Configure providers

Export the credentials required by the selected providers and run:

```bash
export FIRECRAWL_API_KEY="<your key>"
node scripts/configure-mcps.mjs --providers firecrawl,playwright,mermaid
```

Configure only browser and diagram providers:

```bash
node scripts/configure-mcps.mjs --providers playwright,mermaid
```

Configure selected runtimes:

```bash
node scripts/configure-mcps.mjs \
  --runtimes claude,cursor \
  --providers firecrawl,playwright,mermaid
```

The generated destinations are:

- Claude: `~/.claude.json`, in its top-level `mcpServers` object (user scope)
- Cursor: `~/.cursor/mcp.json`
- Codex: `~/.codex/config.toml`, inside `BEGIN/END PRO HARNESS MCP` markers

Claude's user-scope location follows the [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp#user-scope). Existing settings, project entries, and unrelated servers are preserved. The installer does not read, migrate, or remove an older `~/.claude/mcp.json` file.

## Exa alongside Firecrawl

Select `exa` in the existing provider list; no additional skill, plugin, package or installer logic is needed. The hosted endpoint enables only `web_search_exa`, `web_fetch_exa`, and `web_search_advanced_exa`, as documented in [Exa's MCP guide](https://exa.ai/docs/reference/exa-mcp). Live discovery must confirm their availability before use. Exa Agent and private connectors are intentionally excluded.

Keep Firecrawl first for competitor research, bulk extraction and whole-site crawling. Exa adds discovery, page fetching and targeted subpage research—not a mandatory second research pass. Existing satisfactory evidence is reusable.

For a new installation selecting these providers:

```bash
node scripts/configure-mcps.mjs --providers firecrawl,exa,playwright,mermaid
```

For an existing installation, include **all providers already in the Codex managed MCP block** that you want to retain: the current configurator replaces that block with the selected set. Review existing entries first; do not run an Exa-only update that drops other managed providers. Conflicting entries are not overwritten. Catalog availability does not itself activate Exa in an existing client.

The hosted public tier may be rate-limited. Authenticated/production access is separately operator-configured using Exa's current documentation; this catalog does not embed keys or auto-escalate paid usage.

## Failure behavior

Configuration stops without changing a provider when a required environment variable is missing or a provider with the same name already exists with different settings. Move or reconcile the conflicting entry explicitly; do not use a force flag.

Provider availability does not grant permission to use it. Network access, external writes, deployment, rollback, and messaging remain controlled by the active command and the corresponding capability contract.
