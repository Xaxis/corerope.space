# The design

The seven parts of the Corerope stack: an overview page and one page per part, each with its
falsification experiment or a visible TODO where the design doc has none.

<!-- covers: page:/design, page:/design/[slug] -->

## Sub-features

- overview: the design doc's summary, a status callout ("Nothing here is proven at scale"), seven
  part cards with chips ("Falsified by experiment N" or "TODO: no falsification experiment yet"),
  "Where the remaining 1000x hides" with its table, the energy-per-weight ladder and the fleet diagram.
- part pages: split-mind, wired-ternary, rom-core, lookup-in-storage, tokens-per-task,
  context-cartridges, two-tier-fleet. Each renders its section of 02-corerope-design.md verbatim,
  inserts its figures (wired-ternary: gates, SPW, energy ladder; tokens-per-task: tokens chart;
  two-tier-fleet: the fleet diagram in place of the doc's [Diagram:] placeholder, and the Amdahl
  curve), lists its experiments from data/roadmap.json, and has a prev/next pager.
- TODOs: lookup-in-storage (invention 4) and context-cartridges (invention 6) show a TODO callout
  instead of experiment cards.

## How to reach it

- http://localhost:4317/design ; header link "Design"; the part cards; each part at
  http://localhost:4317/design/<slug> for the seven slugs above; the pager between parts.

## How to check it

Static: `pnpm typecheck`, `pnpm lint`, the build (generateStaticParams makes all seven).

Runtime:

```sh
for s in split-mind wired-ternary rom-core lookup-in-storage tokens-per-task context-cartridges two-tier-fleet; do
  printf '%s %s\n' $s "$(curl -s -o /dev/null -w '%{http_code}' localhost:4317/design/$s)"; done
curl -s localhost:4317/design/lookup-in-storage | grep -o 'TODO: no falsification experiment yet' | head -1
curl -s localhost:4317/design/two-tier-fleet | grep -o '\[Diagram:' | wc -l   # 0: the placeholder is replaced
heavy node tools/site/peek.ts --url http://localhost:4317 --path /design/wired-ternary --selector ".fig"
```

Proves it when: seven 200s; the TODO string prints; the placeholder count is 0; the peek PNGs show
the gate bars (435, 75.0, 30.8, 20.0, 26.1, 16.1) and the SPW lines.

## Gotchas

- The part list and section prefixes are in site/lib/inventions.ts. If a heading in the design doc
  is renamed, that page's build fails loudly (section() throws); fix the prefix, not the doc.
- "Seven parts" is the design doc's own count; its sections give six numbered inventions plus the
  fleet. The overview says so in a note under the cards.
