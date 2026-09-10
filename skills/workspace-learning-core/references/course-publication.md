# Course publication

Use the runtime `$docs_publisher` skill as the authority for CLI discovery, authentication, authoring guidelines, schema, validation, publication, and readback.

## Preserve the course

Explainer Pro generations are immutable. Never edit their canonical `course.html`. Create a publication copy beneath the same ignored Explainer artifact root and record both digests.

Declare the publisher artifact type `report`. Adapt presentation only:

- retain the complete course body, navigation, visuals, exercises, citations, and caveats;
- ensure one non-empty `<title>` and one `<h1>`;
- integrate the publisher reader theme without adding a separate theme control;
- mark non-empty `summary`, `context`, `body`, `risks-or-caveats`, and `sources` sections;
- use one grounded source entry per distinct local file/command/conversation/external URL source;
- keep images self-contained as data URLs and external resources absolute HTTPS only.

Do not invent missing content, remove lower-tier claims, convert unknowns into facts, or publish with unknown markers unless the user explicitly approves that exception.

## Gate

1. Run the publisher's live `guidelines` command.
2. Discover the current CLI and create/pull syntax from help.
3. Validate the publication copy with the runtime skill's validator as `report`.
4. Publish with structured output and capture document ID/URL.
5. Pull the hosted HTML and rerun the same validator.
6. Record local and pulled digests plus any byte-equivalence limit.

Missing CLI/auth, failed validation, failed create, or failed readback blocks the repository. Never perform interactive login or widen document permissions without explicit authority.
