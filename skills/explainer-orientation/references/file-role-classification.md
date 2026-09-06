# Learner-focused file classification

Assign each significant file one reason a new reader would open it first. Confirm classifications from content as well as names.

| Role | Meaning | Common evidence |
|---|---|---|
| start-here | establishes runtime, package, or public boundary | bootstrap, package entry, export surface, route registry |
| business-rules | makes a domain or product decision | validation, authorization, calculation, eligibility, transition guard |
| entry-points | receives an external or user action | route, command, UI handler, consumer, exported API |
| data | defines, reads, writes, or transforms state | schema, model, migration, store, repository, serializer |
| supporting | shared mechanism needed by several paths | utilities, shared types, configuration access, common clients |
| infrastructure | declares build, deploy, runtime, or operational wiring | CI, container, infrastructure, monitoring, build configuration |
| generated-vendor | machine-generated or externally maintained material | build output, generated client, lock cache, vendored source |

Exclude the exact `artifact_root`, dependency caches, VCS internals, and build output from learner corpus counts. In a workspace, classify per package before rolling up. Ambiguous files get the best evidenced learning role and an inferred badge.

The start-here shortlist combines entry-point relevance, decision ownership, system-boundary importance, dependency fan-in, and downstream course use. Do not claim an exact comprehension percentage unless an explicit measurement supports it.

