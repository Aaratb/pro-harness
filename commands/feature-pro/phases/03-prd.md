# Phase 3: PRD

> Load this file only when this phase is selected or resumed.

- **Skills**: `create-prd`, `write-user-stories`, and `ab-test-analysis` when experimentation is in scope; add `observability-by-design` for runtime-crossing features and `ai-product-engineering` only when the AI overlay activates
- **Stance**: remain in product definition. Preserve the approved problem, users, reach, outcomes, and constraints; do not turn the PRD into an architecture plan.
- **Mandatory independent challenge** before product-solution approval: coordinator or `product-manager` proposes; a fresh `product-owner` challenges problem/solution fit, alternatives, assumptions, metrics, scope, and acceptance criteria. Follow the bounded challenge contract in routing; record changes and dissent in `prd.md`. Missing agent capability is not permission to substitute self-review.
- Promote the **validated** problem framing from `requirements.md` into a staff-level PRD — the source of truth that product decisions freeze into. Write it for a VP who reads the first paragraph and an engineer who builds from the rest. **Mandatory sections:**
  1. **TL;DR** — one paragraph: problem, who, the bet, and the metric it moves.
  2. **Problem & Context** — the problem, the evidence, and why-now (carried from Phase 2).
  3. **Target Users & Personas** — primary / secondary personas, segments, and the anti-persona, each with their JTBD.
  4. **Opportunity, Impact & Effort Sizing** — reach (accounts/users affected), frequency, severity; business value (revenue / retention / activation / support deflection) **with the math and its assumptions shown**; paired against the **engineering effort/feasibility read carried from Phase 2's Impact Lens** (t-shirt size, systems touched, feasibility flag) so prioritization is an honest **effort-vs-impact** call — not value in a vacuum. Keep this coarse; the precise footprint is the Phase 7 ERD.
  5. **Goals & Non-Goals** — explicit in-scope outcomes and out-of-scope items.
  6. **Product Solution Decision** — compare at least two viable product approaches plus **do nothing**; show user value, evidence, trade-offs, risks, assumptions, and reversibility; recommend one and name why each alternative was rejected. Keep implementation architecture out of this decision.
  7. **Vision & Strategic Alignment** — the desired end state and how it ladders to product/company strategy and the active OKRs.
  8. **Success Metrics — the metric tree** (this is the heart of the PRD):
     - **North Star** this contributes to
     - **Primary** success metric(s), each with a **target** and a **measurement window**
     - **Secondary** metrics
     - **Guardrail / counter-metrics** that must not regress (latency, churn, cost, support volume, error rate)
     - **Instrumentation plan** — events to log, dashboards, and how we'll *read the result*; use `ab-test-analysis` to design the experiment and decision rule where applicable.
  9. **User Stories & Acceptance Criteria** — authored via `write-user-stories`: testable Given/When/Then ACs per story, prioritized (P0/P1/P2 or MoSCoW).
  10. **Scope & Release Strategy** — MVP vs fast-follow vs later; phased rollout / feature flag / cohort plan.
  11. **Risks, Assumptions & Dependencies** — with mitigations and a validation plan for each top assumption. For AI products include model/prompt/context/tool/retrieval boundaries, evaluation thresholds, safety, fallback, cost, latency, drift, and human control without exposing hidden reasoning.
  12. **Open Questions** — each with an **owner** and a **needed-by** date.
- **Quality bar (do not exit until met):** every metric has a target + an owner; every user story has acceptance criteria; opportunity sizing shows its math; no section left "TBD" without an owner and a date; the user explicitly approves the recommended product solution and rejected alternatives in `state.json` → `product_solution`.
- **Escalation:** only if material segment/metric disagreement remains after bounded challenge, use `multi-model-debate-room` with relevant perspectives; record the verdict and dissent in the PRD. Ordinary alternatives do not require an expanded panel.
- **Optional:** on explicit user request, decompose the PRD into tracker-ready issue drafts under `FEATURE_ROOT`; external issue creation still requires explicit authorization.
- **Output**: `.agents/features/<slug>/prd.md`, a validated `prd.html` companion when useful, and updated `requirements.md` if framing shifted.
