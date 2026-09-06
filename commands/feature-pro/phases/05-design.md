# Phase 5: Design / Options

> Load this file only when this phase is selected or resumed.

- **Skills**: `design-options`, `design-system`, `multi-model-debate-room`, `stochastic-multi-agent-consensus` — consumes `competitive-research.md` from Phase 4 when present
- **Capabilities**: use `prototype.generate` when approved and available; local HTML is a valid fallback. Resolve `browser.navigate`, `browser.inspect`, `browser.capture` for authorized local inspection; no new provider or installation is required. Missing rendering leaves visual quality unverified, not passed.
- **Parallel agents**:
  - a design-system + accessibility reviewer — component selection, tokens, WCAG
  - `prototype-designer` — art direction and representative prototypes; expand to multi-screen flows only where needed
  - `ux-researcher` — usability concerns + persona fit
- For backend-only changes, auto-skip with announcement.
- Surface **architecture-driving decisions** in the design memo: data ownership, integrations, AI behavior, security, latency/offline needs, and scale assumptions that shape the experience. Explain open choices to the user; carry them to Phase 6's architecture checkpoint rather than silently choosing a stack. Keep this design-focused, not a duplicate engineering spec.
- **Mandatory independent challenge** before selecting the design: a fresh `prototype-designer` critiques design taste, separate from the proposal author; `ux-researcher` independently challenges flows, states, and user fit. Run these read-only critiques in parallel on the same options, then synthesize under the routing contract. No external generation is needed merely to critique supplied artifacts.
- **Art direction**: apply `design-options` to establish product character from real content and inspected visual references, including sound repository screens. Explain which composition, typography, density, imagery and interaction decisions serve this product, and which reference traits do not. Record the direction, defining decisions, references, contextual anti-goals and selection in the existing decision memo. Do not invent reference observations or preserve a weak baseline merely because it exists.
- **Rendered selection**: for a new visual language or material redesign, show a representative rendered screen before expanding the design; compare alternatives only where a material choice benefits, not a fixed quota of full apps. Use realistic content and relevant viewport/state constraints. Small changes reuse a current approved direction and inspect the changed portion. Present the recommendation at the existing selection point; ask about unresolved material preferences, not already-approved choices. If rendering is unavailable, show the provisional artifact and concrete limitation; only an explicit user waiver permits proceeding with unverified visual quality.
- **Design taste**: inspect the actual rendered options on typography, visual hierarchy, composition, spacing/density, color, interaction character, and distinctiveness—not just compliance. Anchor critique in specific elements and approved context; distinguish subjective taste, usability defects and fidelity. Recommend a coherent direction with rejected alternatives; do not average opinions into a generic design. Record critique/disposition in the existing memo; return material preference conflicts to the user. A functioning, accessible screen alone is not evidence of visual quality.
- **Escalation (deliberation):**
  - Only if material disagreement remains after bounded challenge—or the user explicitly requests deeper debate—use `multi-model-debate-room` on the contested directions. Comparable options alone do not trigger extra rounds.
  - Use `stochastic-multi-agent-consensus` instead when the unresolved decision benefits from independent ranking; size the panel to the uncertainty, not a fixed N=5. Preserve dissent and user-owned taste decisions.
- **Output**: `.agents/features/<slug>/design/` with HTML prototypes + decision memo

## Additional phase requirements

- For visual surfaces, produce a **token plan before any component code**: hierarchy, type roles, spacing/density, semantic color values, and interaction character grounded in the task and existing brand. Reuse sound tokens. Explain what should feel distinctive or deliberately familiar and why; impose no palette, font, or novelty quota.
- Quality floor regardless of aesthetic direction: responsive at mobile/tablet/desktop, visible keyboard focus, and `prefers-reduced-motion` respected.
