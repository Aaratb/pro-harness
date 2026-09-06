# Product Note boundaries and reconciliation

Use this reference for coverage, unclear boundaries, existing human notes and changed premises. It adds judgments to the standalone skill; it does not require a new table, approval system or PRD template.

## Meaning before polish

A note must identify a recognizable capability and the progress it is intended to support. A title such as “Smart operations” supplies too little meaning to infer an actor, obstacle and solution. Retain it as an unresolved item, state exactly what is missing, and draft only the supported portion. Do not fill the gap with generic claims about efficiency or a list of features invented to make the title concrete.

Where one row hides several distinct capabilities, describe the known umbrella honestly and flag its unresolved boundary. Offer a split only as a proposal; do not create new accepted feature identities or count the umbrella as a fully clarified item. Conversely, preserve separate same-title rows when their audiences, situations or intended changes differ.

Illustrative wording, not a mandatory shape:

> **Share a saved report:** Let an account analyst give a colleague access to an existing report so they can discuss the same information without rebuilding it. The intent is to reduce duplicated preparation. Recipient access rules remain open.

That wording would be wrong if the supplied intent were to send an immutable historical copy: access to an existing report and receipt of a fixed snapshot imply different behavior. Resolve that distinction from the source or leave it explicit. Concision does not excuse changing the idea.

Keep supplied detailed decisions accessible through their source or existing fields. They need not be copied into the note or discarded to make the note simple. Preserve a qualification that changes meaning; leave implementation and exhaustive specification to the PRD.

## Establish the coverage universe

Use the supplied review scope and stable identities to distinguish:

- Current, human-reviewed features: include all dispositions, not only the selected set. A rejected feature can still be a current row worth explaining.
- Current, unreviewed or ambiguous features: retain them in the coverage account; draft provisionally where meaning is supported and identify the unresolved review or interpretation.
- Headings and administrative rows: exclude as non-features with a stated basis. Do not infer a feature from every populated cell.
- Explicitly archived/deleted history: exclude from current coverage while preserving its identity/history. Rejection alone does not imply archival.

If only a filtered view or partial packet is supplied, report coverage for that visible scope; the unseen backlog is uninspected. Do not calculate an all-backlog completion percentage from an unknown denominator. A missing note, a vague placeholder and an unsupported explanation remain coverage gaps; an adequate unchanged human note is covered. Count a proposed revision separately from accepted wording when that distinction matters.

Do not resolve conflicting or missing identities by title alone. A renamed row, duplicate title or apparent replacement may need a source-to-item mapping before its old note can be reused. A material change can reopen a previously covered note. Preserve both versions and disclose the affected scope instead of silently transferring an old approval.

## Human text and imported decisions

Treat existing human wording as part of the source of intent. Preserve it verbatim when returning a revision proposal, or reference its stable location if copying would be unnecessary. Separate an editorial suggestion from a change to audience, promise or scope. Clear wording does not authorize replacing a human's priority or rationale.

An imported “accepted” flag is a claim about a past decision. Without trusted decision context, identify that claim and return useful draft notes where possible; do not describe them as accepted or the backlog as fully reviewed. A comment may ask a question, express disagreement or propose a change. Interpret it at that scope rather than treating every comment as authorization.

## Corrections and downstream disagreement

For each material correction or PRD conflict, make the affected item, old interpretation, new evidence or proposal, consequence and unresolved human choice findable. This can be a brief paragraph beside the note; it need not become a mandatory ledger.

Distinguish three outcomes:

- **Clarification:** wording improves while the audience, problem and intent remain the same. Propose the change without implying fresh prioritization.
- **Different means:** a PRD discovers a better way to serve the same intent. Explain why the earlier mechanism changed and preserve the original rationale; do not reject the PRD for departing from the note.
- **Changed intent or contradicted premise:** the PRD or new evidence changes whom the feature serves, which problem matters, or what outcome is promised. Identify the decision that must be reconsidered and return it to the human. Preserve useful unaffected meaning and mark the disputed part unresolved.

Do not leave a contradicted factual promise active with a vague caveat beneath it. A proposed replacement can be precise while the accepted historical note remains preserved and flagged for review. Do not claim another artifact was changed unless that specific authorized update actually occurred.
