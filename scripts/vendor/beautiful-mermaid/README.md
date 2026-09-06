# Local diagram renderer

`renderer.mjs` is a pinned, self-contained Node ESM build used by
`scripts/lib/explainer-diagram.mjs`. It needs no install, browser, network, or
runtime package resolution. Do not load this bundle in the course HTML: the
publisher embeds the resulting static SVG images, not the renderer.
It also exports `SaxesParser` for the publisher's XML well-formedness and SVG
allow-list validation; the XML parser is not a DTD validator or SVG sanitizer.
The adapter resolves the pinned renderer's known paint attributes to literal
colors and adds a background rectangle for passive SVG viewers. Text, labels,
geometry and canonical Mermaid source are not rewritten by this paint step.

## Provenance and licenses

| Component | Version | License | Corresponding source |
|---|---|---|---|
| beautiful-mermaid | 1.1.3 | MIT | https://github.com/lukilabs/beautiful-mermaid and the pinned npm source archive below |
| elkjs | 0.11.0 | EPL-2.0 | https://github.com/kieler/elkjs/tree/v0.11.0 and https://github.com/eclipse-elk/elk/tree/v0.11.0 |
| entities | 7.0.1 | BSD-2-Clause | https://github.com/fb55/entities/tree/v7.0.1 |
| saxes | 6.0.0 | ISC | https://github.com/lddubeau/saxes/tree/v6.0.0 |
| xmlchars | 2.2.0 | MIT | https://github.com/lddubeau/xmlchars/tree/v2.2.0 |

The full license texts accompany this file. ELK copyright: Kiel University and
other contributors; copyright and SPDX notices are also retained in the bundle.
The corresponding unmodified ELK source is publicly available at the source
locations above and its pinned distribution archive. No ELK changes were made.

`strict-local.patch` modifies only beautiful-mermaid: reject statements or
suffixes previously ignored, reject malformed/unclosed blocks and unsupported
entity constraints, reject silently lost late label definitions, avoid consuming
compact flow arrows as node IDs, remove remote Google Fonts imports, and dock
UML composition/aggregation diamonds outside class boxes at either edge end.
This is a local compatibility build, not an assertion of full Mermaid support.

Pinned package archives and SHA-512 integrity:

- https://registry.npmjs.org/beautiful-mermaid/-/beautiful-mermaid-1.1.3.tgz
  `sha512-TItrtrAyHp1vwFfFVYauWGrquouk/6SS21Aq3RsxindSYZODcN4xYrPZD6BiZRU+o5mKJzDPz9MUSMvELdylyg==`
- https://registry.npmjs.org/elkjs/-/elkjs-0.11.0.tgz
  `sha512-u4J8h9mwEDaYMqo0RYJpqNMFDoMK7f+pu4GjcV+N8jIC7TRdORgzkfSjTJemhqONFfH6fBI3wpysgWbhgVWIXw==`
- https://registry.npmjs.org/entities/-/entities-7.0.1.tgz
  `sha512-TWrgLOFUQTH994YUyl1yT4uyavY5nNB5muff+RtWaqNVCAK408b5ZnnbNAUEWLTCpum9w6arT70i1XdQ4UeOPA==`
- https://registry.npmjs.org/saxes/-/saxes-6.0.0.tgz
  `sha512-xAg7SOnEhrm5zI3puOOKyy1OMcMlIJZYNJY7xLBwSze0UjhPLnWfj2GF2EpT0jmzaJKIWKHLsaSSajf35bcYnA==`
- https://registry.npmjs.org/xmlchars/-/xmlchars-2.2.0.tgz
  `sha512-JZnDKK8B0RCDw84FNdDAIpZK+JuJw+s7Lz8nksI7SIuU3UXJJslUthsi+uWBUYOwPFwW7W7PRLRfUKpxjtjFCw==`

## Maintainer rebuild (not an installation step)

In an isolated temporary build directory, install the exact packages above and
build-only `esbuild@0.25.5` using `--ignore-scripts --save-exact`. Verify package
integrity, copy beautiful-mermaid's source package to `package/`, then apply
`strict-local.patch` with `patch -p1` in that copied directory. Its dependencies
resolve from the build directory's `node_modules`, not from the harness.

Create `entry.mjs` in the build directory with these exports:

```js
export { renderMermaidSVG } from './package/src/index.ts';
export { SaxesParser } from 'saxes';
```

Run from that build directory:

```bash
node node_modules/esbuild/bin/esbuild entry.mjs --bundle --platform=node --format=esm --target=node20 --minify --legal-comments=inline --outfile=renderer.mjs
```

The resulting file is 1,607,249 bytes, SHA-256:
`e5207aabf9aee79831b1f63b3b4b29b48f1deab9a61838db898ed83e767ff286`.
Re-run renderer, publication, containment, HTML safety and visual checks before
replacing it. esbuild is build-only and is not distributed or run by the installer.

## Supported local surface

The adapter handles bounded flowcharts (including semicolon-separated statements
outside labels), sequences with messages/aliases/notes and alt/loop/opt/par blocks,
UML class relationships and multiline members, ER cardinalities/attributes, and
state transitions/composites. It does not claim every Mermaid construct: custom
styles/links/configuration, other diagram families, explicit sequence activation,
autonumber, notes before the first sequence message, crossed-out/headless arrows
and nested class namespaces must use a
compatible safely rendered SVG from `diagram.render`. Unknown constructs fail
explicitly; do not delete meaningful semantics simply to satisfy this renderer.
