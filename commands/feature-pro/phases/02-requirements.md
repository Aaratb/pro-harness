# Phase 2: Problem Framing

> Load this file only when this phase is selected or resumed.

- **Skills**: `product-discovery`, `grill-with-docs`, `competitive-research`, with `user-personas` and `customer-journey-map` when the feature changes user journeys; add `observability-by-design` for measurable runtime outcomes and `ai-product-engineering` only when the AI overlay activates
- **Capabilities**: resolve `firecrawl.search`, `firecrawl.scrape`, `firecrawl.crawl`, and `firecrawl.extract` through the MCP registry before the research lane begins.
- Apply `product-discovery` and `grill-with-docs` inline as one integrated pass using the user's existing goal, answers, and Phase 1 context. Save a single `requirements.md`, not separate discovery and grill reports. Do not repeat questions already resolved.
- **Agents — default: no agents.** This is a conversation with the user. Use `product-manager` only for a concrete independent assessment that cannot be completed well inline, not because a routing table lists it.
- **Run this as a staff PM, not an engineer.** Do **not** jump to a solution. Address the checklist proportionately with evidence, an explicit owned assumption, or justified N/A. It is a coverage check, not a ten-round interview. Ask the next material missing question promptly before unnecessary tool or agent work; do not investigate facts unrelated to asking it.

  **Problem-framing checklist (must all be addressed before exit):**
  1. **Problem statement** — user/business problem, not an implementation request.
  2. **Evidence it's real** — available user, business, or usage evidence; otherwise label a hypothesis.
  3. **Reach & impact** — affected users, frequency, severity, and expected benefit; estimates are labeled, never fabricated.
  4. **Who we're solving for** — primary/secondary users and who is out of scope; use `user-personas` when useful.
  5. **Current state & journey** — workaround, competitor, or nothing; use `customer-journey-map` for meaningful journey changes.
  6. **Why now / strategic fit** — timing and priority, without inventing company strategy.
  7. **End goal & desired outcome** — intended user/business behavior change.
  8. **Success-metric framing** — primary measure and guardrails; secondary/North Star only when relevant. PRD finalizes targets.
  9. **Constraints & non-goals** — scope, tenancy, compliance, scale, cost as applicable.
  10. **Risks & assumptions** — material adoption, technical, legal, or market uncertainty with ownership.

  **Goal-first rule:** when intake has no credible business requirement or measurable goal, stop solution discussion and establish the desired behavior change, business outcome, metric, target, measurement window, and accountable owner. Record user approval in `state.json` → `business_requirement`. Phase 3 may not begin before this boundary is approved.

  **Engineering Impact Lens (coarse, product-grade — shift-left feasibility):** before locking scope, make a brief feasibility note from available Phase 1 evidence or relevant source. In greenfield work, label anticipated systems as planned assumptions; a codemap is unnecessary. This is **not** the ERD (no file-by-file scan, no schema design — that is the Phase 7 ERD, after engineering requirements).
  - **T-shirt size** — XS / S / M / L / XL, with the one-line reason.
  - **Systems touched** — which apps / services / data stores / external providers are *likely* in scope (module-level, not file-level).
  - **Top dependencies & unknowns** — the 1-3 things that could blow up the estimate (migration, cross-team API, new infra, third-party limits).
  - **Build-vs-buy / reuse** — is there an existing capability or pattern to lean on?
  - **Observability feasibility** — can the outcome and guardrails actually be measured, and which runtime boundaries will need correlation?
  - **Conditional AI necessity** — if AI is proposed, why uncertainty is useful here, what deterministic approach was rejected, and which quality, safety, latency, cost, privacy, fallback, and human-control outcomes matter.
  - **Feasibility flag** — green / yellow / red, surfaced to the user if the cost looks disproportionate to the framed impact.
  Inspect a bounded relevant source slice inline only when needed; use `repository-explorer` only for a justified substantial unknown. Do **not** spin up architects or write a design. Raise material feasibility risk immediately.
- **Competitive / alternative research lane (runs alongside the checklist, not after the PRD):** treat research as problem evidence. Separate observed competitor facts from inference, and do not select implementation architecture here.
  - **Skip this lane** — announce it — for a backend-only change, an internal tool, no external market, or when `competitive-research.md` already exists. Skipping the lane never skips the phase.
  - **Landscape scan** — the 8-12 competitors that matter: feature set, pricing, target user, positioning, gaps. Record source URLs and retrieval time.
  - **Alternatives scan** — what users do instead today, including doing nothing, a spreadsheet, or a competitor's workaround. This feeds checklist item 5.
  - **Methodology scan** — the vocabulary, frameworks and benchmarks the market has converged on, or deliberately has not. Name the terms-of-art to adopt or reject.
  - **Escalation**: if the scans surface 3 or more viable wedge opportunities, load `stochastic-multi-agent-consensus` (N=5) to rank them by defensibility x reachable-market x build-cost.
  - **Output**: `.agents/features/<slug>/competitive-research.md` — feature/pricing matrix, vocabulary glossary, 3-5 wedge opportunities with rationale. It is an input to Phase 3, never a correction to it.
  - **Cost note**: roughly 5-10 minutes of delegated research and network access. If network is unavailable, mark the lane `blocked` and tell the user; the rest of the phase continues.
- Within the same pass, use `grill-with-docs` as the **Decision Confidence Gate**, classifying intake as `clear`, `confirm`, or `grill`. Clear intake goes directly to the approval summary; uncertain high-impact decisions get one question at a time. Do not run a second grill or create an extra approval between discovery and framing.
- **Escalation:** only for materially contested framing that remains unresolved after a concise comparison, consider `stochastic-multi-agent-consensus`; explain the benefit before additional delegation. No fixed five-agent panel for ordinary intake.
- **Exit criterion:** do not advance until items 1, 3, 4, and 8 (problem, reach/impact, users, success metrics) are each answered with evidence or an owned assumption, the research lane has run or been explicitly skipped, and the measurable business requirement has an owner plus explicit user approval.
- **Output**: `.agents/features/<slug>/requirements.md` plus validated `requirements.html` when an artifact companion adds review value, structured by the 10-point checklist plus the Engineering Impact Lens summary, alongside `competitive-research.md` when the lane ran, with every item either evidenced or labeled `ASSUMPTION (owner: <who>)`.

## Additional phase requirements

- Every claim about existing system behavior cites `path:line` from a file actually opened. Proposed new behavior or a user-stated goal does not require a source citation; label it as proposed or user-provided. Never invent code evidence for an empty repository.
- Interrogate one question at a time; a batched question list gets one blanket answer that resolves nothing.
- For material choices, follow `grill-with-docs`' native option-selector guidance: 2–3 alternatives with brief trade-offs and a custom-answer route. Keep open discovery open-ended; selector presentation changes neither approval requirements nor the lightweight inline default.
- After the spec exists, self-review it for exactly four failure modes: **placeholders** (`TODO`, `similar to above`, `etc.`), **internal contradictions**, **scope creep** beyond the stated ask, and **ambiguity** a second reader would resolve differently. Fix before advancing.
