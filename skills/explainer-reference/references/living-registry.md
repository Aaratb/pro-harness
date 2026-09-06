# Living term and convention registry

The registry persists knowledge across phase and capability invocations.

Term record:

```text
{term, definition, evidence_level, first_use_cite, phase_introduced, owner_section}
```

Convention record:

```text
{category, rule, example_cites, instance_count, evidence_level, owner_section}
```

Teach a term at first use, then link later uses. Reuse the same name for the same concept. Append only new records during phases; render the consolidated glossary and conventions once in the reference phase.

When a section is replaced, remove the records it owns before merging replacements. A capability reads persisted registry and claim files, never reconstructed chat summaries. Missing required records stop the capability and identify its prerequisite.

