# Generation and rendering contract

The durable course is state, not conversation memory.

## Layout

```text
<artifact_root>/
├── state.json
├── CURRENT
├── run-events.jsonl
├── source-fingerprint.json
├── dependency-graph.json
├── work/lanes/
└── generations/<generation-id>/
    ├── manifest.json
    ├── claims.json
    ├── registry.json
    ├── sections/
    ├── diagrams/
    ├── EXPLAINER.md
    └── course.html
```

`CURRENT` contains one generation identifier followed by a newline. It is never a symlink. Published generation files are immutable.

## Publication

Publish once per meaningful phase delivery or user-requested capability checkpoint, not once per section. Related capabilities may share one bounded `publish --batch` input of section/claims path pairs. Check prerequisite closure against retained current sections plus independently gated members of the batch, and order dependent authoring accordingly. The single-section `--section` / `--claims` interface remains supported. Only the coordinator publishes; concurrent lanes write distinct staging inputs.

1. Validate the source fingerprint and candidate state.
2. Build a complete generation in a private staging directory beneath `artifact_root`.
3. Validate schemas, prerequisite closure, claim references, section order, HTML safety, and self-containment.
4. Rename the staging directory to a unique immutable generation identifier.
5. Write a temporary current-pointer file and atomically rename it to `CURRENT`.
6. Update state and append a redacted event.

If any step fails, leave the prior `CURRENT` untouched and return the safe retry action.

## Capability replacement

Each section declares its capability, prerequisites, claim identifiers, source fingerprint, and content digest. Replacing a capability removes registry records it owned and marks all transitive dependents stale before publication, except independently re-grounded replacements included in the same batch. A stale section cannot appear as current. Retain unchanged sections and claim records without changing their evidence timestamps. An optional `--registry` supplies the complete candidate term/convention registry, with replaced-owner records regenerated and invalidated-owner records removed; without it, retain only unaffected records.

Dependency invalidation includes actual referenced claim owners in sections, diagrams, and quizzes, not only the routing prerequisites. A stable claim identifier does not make a changed interpretation safe to reuse. Rendered diagrams must also retain their published content digests before carryforward; a legacy or modified asset without a valid digest requires re-grounding, not silent trust.

Run the lifecycle hook once after each checkpoint; its run validator includes course checks. At terminal delivery use the completion hook, which also validates tracing. Do not separately repeat its component validators against unchanged inputs.

## HTML

The course is one continuous, self-contained visual field guide with inline CSS and JavaScript, semantic headings, a reading path/current chapter, visible focus, sufficient contrast, responsive and print layouts, captions and accessible text for diagrams, and no network-loaded assets. Show the diagrams beside the mechanism, not after a long evidence dump. Technical evidence and canonical diagram source belong in expandable disclosures; prose, lists and tables remain readable, while actual fenced code uses `<pre><code>` with preserved whitespace. Escape all source-derived content. Support diagram enlargement, keyboard navigation and reduced motion. Quiz behavior uses scoped event listeners and does not expose correctness through markup labels or styling before selection. The core guide and source remain usable without scripts.

## Diagrams

Store canonical diagram source and its local rendered asset. When no asset is supplied, the publisher attempts supported Mermaid locally using the bundled renderer. It returns actionable `render_warnings` for unsupported source, keeps the draft visibly partial, and refuses `--certified` until all declared diagrams are rendered and the full course's architecture/sequence/dependency views exist. An unsupported feature must not be silently removed to satisfy the gate; use the existing local rendering capability. Unsafe supplied SVG fails publication and leaves the prior `CURRENT` intact.

Validate SVG before writing immutable sidecars; embed each as its own base64 SVG image so local marker IDs and CSS cannot collide with other views or the page. Every SVG retains its manifest digest and must be present as an image in the HTML, not only as source. The HTML is self-contained with a restrictive content security policy. Browser inspection checks loaded images, clipped labels, legibility, zoom/focus, disclosures and practice on a representative desktop and narrow viewport. Missing browser access is disclosed as unverified visual inspection, never substituted with a claim that a text validator proved the experience.

## Doubts

A doubt is a state record with stable identifier, question, affected capability, evidence references, status, timestamps, and resolution. Answer from the current claim pool after fresh checking. Publish the answer through a new generation; never append to an old artifact.
