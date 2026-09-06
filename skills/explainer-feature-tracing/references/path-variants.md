# Path-variant contract

Enumerate only variants evidenced within the declared trace boundary.

Candidate variants include primary success, validation rejection, authorization denial, missing data, domain conflict, dependency failure, retry, compensation, timeout, cancellation, optional branch, concurrent work, deferred continuation, and terminal error.

For each variant record stable path identifier, trigger, divergence hop, ordered hops, exit identifier, observable outcome, claim identifiers, and static-analysis limitation. Search guards, branches, throws, catches, error mappings, retry configuration, and tests. An expected-but-unfound variant is an open question, never a drawn path.

`all paths` means all statically evidenced variants within the named feature, reachable files, and search strategy. It never implies dynamic dispatch or external systems were exhaustively observed.

Teach consequential variants by contrast with the running example: identify the changed input, prior state, permission, or dependency result that activates a cited branch, then explain the changed return, effect, or continuation. Keep unrelated assumptions the same only where source supports that comparison. This is a source-based walkthrough, not a request to exercise the path. A catch block proves its handling when reached, not that every dependency failure reaches it; a test demonstrates its stated setup, not every live outcome. Do not multiply examples for syntactic branches that add no new understanding.
