# Phase 4: Competitive Research

> Load this file only when this phase is selected or resumed.

- **Skills**: `competitive-research`
- **Capabilities**: resolve `firecrawl.search`, `firecrawl.scrape`, `firecrawl.crawl`, and `firecrawl.extract` through the MCP registry before research begins.
- **Stance**: treat research as product evidence. Separate observed competitor facts from inference and do not select implementation architecture in this phase.
- **Auto-skip when**: backend-only change, internal tool, no external/competitive market, or `competitive-research.md` already exists
- **Parallel research lanes** (one coordinated dispatch through the canonical agent capability):
  - **Landscape scan** — top 8-12 competitors in the space: feature set, scoring methodology, pricing, target user, positioning, gaps. Use the Firecrawl MCP capabilities declared by `competitive-research`; record source URLs and retrieval time.
  - **Methodology scan** — vocabulary, frameworks, and benchmarks the market has converged on (or hasn't). Surface terms-of-art the PRD/landing page should adopt or deliberately reject.
- **Escalation**: if the two scans surface ≥3 viable wedge opportunities, load `stochastic-multi-agent-consensus` (N=5) to rank them by defensibility × reachable-market × build-cost.
- **Output**: `.agents/features/<slug>/competitive-research.md` containing:
  - Feature/pricing matrix across competitors
  - Methodology vocabulary glossary
  - 3-5 wedge opportunities with rationale
  - Recommended PRD/Design adjustments (fed into Phase 5 as input)
- **PRD Impact Checkpoint (mandatory before Phase 5)**:
  1. Compare `competitive-research.md` recommendations against `.agents/features/<slug>/prd.md`.
  2. If recommendations clearly require PRD updates and do not need product judgment, update `prd.md` immediately and summarize the exact changes.
  3. If recommendations raise a product-choice question, pause and ask the user directly before editing the PRD.
  4. If no PRD change is needed, explicitly record "No PRD change required after competitive research" in the Phase 4 summary and `state.json`.
  5. Do not proceed to Phase 5 until one of those three outcomes is complete.
- **Cost note**: expect roughly 5–10 minutes of delegated research and network access. If network is unavailable, mark the phase `blocked` and tell the user.
