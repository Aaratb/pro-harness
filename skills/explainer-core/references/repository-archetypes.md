# Repository shapes

Detect the relevant shape before choosing vocabulary or a trace spine.

| Shape | Evidence signals | Typical trace spine |
|---|---|---|
| backend service | routes, server framework, service or domain layer, persistence | request → entry → decision → persistence/integration → response |
| frontend application | UI framework, router, components, client state, fetch layer | user event → handler → state/data client → response → render |
| mobile application | platform manifest, navigation, screen or view model | gesture → screen → model/service → local or remote state → UI |
| command-line tool | binary entry, argument parser, command registry | arguments → parse → dispatch → operation → output and exit |
| data pipeline | jobs, transforms, orchestration, materializations | source → transform → materialization → downstream consumer |
| ML system | datasets, model, training/evaluation loop, artifacts | input → preprocessing → model → metric/prediction → artifact |
| infrastructure code | providers, resources, modules, state backend | input → resource graph → provider operation → declared state |
| library or SDK | exports and public API without an application entry | caller → validation → implementation → result or error |
| event or worker service | consumer registration, broker, worker loop | message → consumer → decision/effect → acknowledgement or retry |
| mixed workspace | workspace manifest with packages of different shapes | classify per package and trace across package boundaries |

The shape name is inferred unless the repository declares it. Mixed signals require alternatives and a coverage note. Use the repository's actual roles; never rename a hook, transform, resource, or command into a controller/service/repository template.

The meaning of data and deferred work changes with the shape. A frontend may model client state; a pipeline models table grain and lineage; infrastructure models a resource graph; a pure library may have no persistent lifecycle. Async syntax or a promise does not itself mean background work: an awaited asynchronous operation may finish before the awaiting caller's operation completes. Distinguish a function's immediate promise return from that observable completion. Classify whether the caller waits, whether an effect is persisted, and whether continuation survives the relevant completion boundary from the actual call and scheduling mechanism; keep unknown external behavior explicit.
