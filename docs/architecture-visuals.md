# Architecture Pro visual delivery

Architecture views are working decision tools, not a final documentation appendix. Render them at the existing Phase 2 context, Phase 7 options, Phase 9 deep-design, and Phase 12 walkthrough checkpoints. ADR-only uses Phases 2, 7, and 9; it does not acquire more phases or a full-system diagram quota.

## Design together around the view

Show provisional shapes early enough that the user's answer can change them. Frame one consequential choice in plain language, explain the recommendation and its strongest objection, then visibly revise the affected boundary or contract. Use the existing question selector when available and permitted; accept free-text alternatives. A selector default is not an answer or sign-off. Keep the existing/new/changed/removal legend intact while the proposal evolves.

An illustrative exchange—not a required script or evidence of a runtime test:

- Architect, pointing to the completion arrow: “An immediate result keeps the flow simple, but the user waits through slow work. A pending result adds status handling. Which behavior can your users accept?”
- User: “Pending is fine for exports, but preview must finish immediately.”
- Architect: “That separates the two contracts. Preview keeps the direct response; export may use a pending status. I'll revise those arrows and examine the operational cost before recommending new infrastructure.”

The answer changes desired behavior; it does not prove existing code works that way or approve the architecture. Preserve current-source evidence separately. Continue exploring the remaining consequential trade, not another round of the same question. When the premise changes, revise only affected views and dependent decisions through existing legal transitions. The walkthrough is a shared stress test, not a lecture or a test of the user's memory.

## Reuse the current artifact

Keep diagrams in fenced `mermaid` blocks inside the current phase's existing Markdown packet, near the decision they explain. Give each view a useful heading, scope, checked baseline or proposal identifier, a visible legend, and a short consequence or question. There is no new diagram manifest or workflow-state schema.

Phases 2, 7, and 9 do not prescribe a fixed Markdown basename. Use the file already chosen for that packet and a matching `.html` companion; do not create duplicate `context`, `options`, or `design` documents just to match an example. Phase 12 uses `EXPLAIN.md` and `EXPLAIN.html`.

`HARNESS_ROOT` below is the resolved installed Pro Harness root supplied by the runtime adapter; `ARCHITECTURE_ROOT` is the already-authorized repository-owned artifact root. Do not redirect either to a historical harness or an alternate output directory. Use contained relative paths for source and output.

```sh
node "$HARNESS_ROOT/scripts/generate-artifact-companion.mjs" \
  --artifact-root "$ARCHITECTURE_ROOT" \
  --source EXPLAIN.md --out EXPLAIN.html \
  --profile architecture --render-diagrams

node "$HARNESS_ROOT/scripts/validate-artifact-companion.mjs" \
  --artifact-root "$ARCHITECTURE_ROOT" \
  --source EXPLAIN.md --html EXPLAIN.html --render-diagrams
```

Substitute the current packet's source/output paths for earlier phases. Do not pass `--state`: the generic companion metadata shape is not Architecture's state contract. Record the actual source and HTML file digests through existing `state.artifact_digests`; regenerate the companion after meaningful source changes. Reuse current validated output when its source is unchanged. Leave the lifecycle hook as the single workflow-validation entry point.

## Local rendering and limits

The opt-in `--render-diagrams` path reuses the existing bounded renderer and SVG safety checks. It performs no network access, package installation, or target-code execution. It embeds safe SVG images in a self-contained HTML document, keeps Mermaid source collapsed, and offers full-size viewing for detailed diagrams. This is ordinary authorized artifact work by the orchestrator; static lane agents still return content without execution or write permission.

The supported Mermaid subset covers flowcharts, sequence, class, ER, and state views. It does not support every Mermaid extension, custom styling directive, interaction, or configuration block. Put change status in readable labels and a legend rather than relying on `classDef` or colour alone. Unsupported syntax fails with an error without replacing a previously generated HTML file. Such an older companion is stale after its source changes; do not deliver it as the current rendered design.

Simplify unsupported notation only when its meaning can be preserved, or split a dense view into coherent parts. Never remove a consequential branch merely to make rendering pass. If a needed view cannot be rendered locally, disclose the incomplete visual deliverable and retain the source and architecture evidence. External `diagram.render` remains optional and requires its existing digest-bound manifest and consent before transferring content. A local failure does not authorize a new provider, installation, or external transfer.

## Make existing versus proposed unmistakable

Use stable node and relationship identities across views. Title each view `As-built — <scope/revision>`, `Proposed target — <option/decision>`, or `Changes — <baseline to proposal>`. A greenfield view shows real existing integrations separately from the proposed system.

Use an explicit text legend and mark both nodes and edges, directly or through an unambiguous local key:

| Status | Meaning |
| --- | --- |
| EXISTING / unchanged | In the checked baseline and retained. |
| NEW / proposed | Added by the proposed option, not already implemented. |
| CHANGED / existing to proposed | Retained identity with a named before/after responsibility or contract change. |
| PROPOSED REMOVAL | Exists now but is omitted from the target; not a completed deletion. |

An unchanged API and unchanged store may have a changed interaction. Label the relationship's contract/action and status independently of its endpoints. A retargeted connection may be an old removal plus a new edge. Sequence participants and messages follow the same rule. Evidence confidence is separate: inferred current behavior remains explicitly inferred, not mislabeled proposed. Keep arrows' synchronous/async/conditional meaning intact; status must not overload those semantics. Use readable before/after views when a combined overlay would obscure what currently runs.

## Inspect and show the result

Open or show the actual HTML companion in an available local viewing surface. Inspect the rendered view at normal reading size and, for dense details, the full-size view. The reader should identify the system shape, responsibility boundaries, current versus proposed nodes and edges, direction, one important path, and the decision consequence without opening Mermaid source. Check overlap, clipping, label size, whitespace, navigation, and the legend in monochrome. Improve density and hierarchy instead of shrinking the whole diagram until labels are unreadable.

Keep four distinct statements in existing evidence or phase updates: source/graph checks; rendering and safety validation; actual visual inspection; and user understanding/acceptance. A green helper result proves neither semantic architecture correctness nor visual quality. If direct inspection is unavailable, report it as unverified; if rendering fails, report visual delivery incomplete. Preserve useful architecture evidence and the existing authority and certification gates. Do not label the visual work completed simply because the structural run packet validates.
