# Phase 5: Solution Hardening & Approval

> Load this file only when this phase is selected or resumed.

- **Skills**: `plan-product-review`, `grill-with-docs`, `stochastic-multi-agent-consensus`; add `ab-test-analysis` when the release strategy depends on an experiment and `ai-product-engineering` only when the AI overlay activates
- **Why this phase exists**: every divergent input is now in — problem framing and its evidence (Phase 2), the competitive and alternatives research (Phase 2), the drafted solution options (Phase 3), and rendered prototypes (Phase 4). This is the first point at which approving a solution is an informed act rather than a bet that later research will not contradict. Nothing downstream corrects an approved PRD; that loop is gone by construction.
- **Inputs**: `requirements.md`, `prd.md`, `competitive-research.md` when the lane ran, and `design/` with its decision memo.
- **Agents**: `product-owner` hardens; a **fresh** `product-manager` challenges. The challenger must be a different instance from the author, per the bounded challenge contract in routing.

**Hardening pass — reconcile the PRD against everything learned since it was drafted:**

1. **Research reconciliation** — for each recommendation in `competitive-research.md`, state one of: absorbed into the PRD (say where), deliberately rejected (say why), or not applicable. An unreconciled recommendation blocks approval.
2. **Prototype reconciliation** — where the rendered design changed what the solution actually is, update the PRD to match what was shown. A PRD that describes a solution the prototype contradicts is the defect this phase exists to catch.
3. **Evidence reconciliation** — every claim carried from Phase 2 is still labeled evidence or `ASSUMPTION (owner: <who>)`. Research that turned an assumption into evidence, or refuted it, is recorded either way.
4. **Metric reconciliation** — targets and guardrails survive contact with the research. A target the competitive landscape shows to be implausible is corrected here, not defended.
5. **Scope reconciliation** — restate MVP against what the prototypes revealed. Cutting scope here is cheap; cutting it in Phase 9 is not.

**Mandatory independent challenge** before approval: a fresh `product-manager` attacks problem/solution fit, the rejected alternatives, the sizing math, the metric tree, and the do-nothing option. Record objections and their disposition in `prd.md`. Missing agent capability is not permission to substitute self-review.

**Escalation:** only if material disagreement survives the bounded challenge, use `stochastic-multi-agent-consensus` to rank the contested options; size the panel to the uncertainty rather than a fixed N. Preserve dissent.

- **The approval gate.** Present the recommended solution, the alternatives and why each was rejected, the do-nothing case, the metric tree with targets and windows, and the scope line. **Wait for explicit user approval.** Record it in `state.json` -> `product_solution` with the approved scope and the rejected alternatives. This is the single product-solution approval in the workflow; Phase 6 may not begin without it.
- **Auto-skip**: never. A change with no product decision still needs its solution stated and approved in one line; that is cheap, and skipping it is what produces contradictory requirements in Phase 6.
- **Output**: an updated `.agents/features/<slug>/prd.md` carrying the reconciliation record and the approval, plus a validated `prd.html` companion when one adds review value.

## Additional phase requirements

- **Reconcile, do not rewrite.** If reconciliation would change the problem itself rather than the solution, that is a Phase 2 finding: say so and return there. Silently redefining the problem inside an approval phase defeats the gate.
- **"No change required" is a valid outcome and must be stated.** Record it explicitly against the specific input that required no change; an unmentioned input reads as an unexamined one.
- Approval covers the solution as presented. A material change after this point reopens this phase rather than being absorbed downstream.
