# The design

The seven parts of the Corerope stack on one page: where the remaining 1000x hides, then each part
with its summary, how it could fail, its falsification experiment (or a visible TODO), and its
evidence, three of them with WebGL scenes.

<!-- covers: page:/design, page:/design/:slug -->

## Sub-features

- intro: the design doc's title and summary, the "A design, not a result" status, stats (749x,
  263x, parts and how many lack an experiment).
- subnav: sticky chips for the overview and the seven parts, with the current one marked.
- `#where`: the headroom table and the energy ladder.
- one split chapter per part (`#split-mind`, `#wired-ternary`, `#rom-core`, `#lookup-in-storage`,
  `#tokens-per-task`, `#context-cartridges`, `#two-tier-fleet`): the summary, a "Why it could fail"
  style quote (RISK in site/app/design/page.tsx), the experiment cards from data/roadmap.json, and
  the evidence: fleet, wired and corerope scenes, gate and SPW charts, tokens chart, the Amdahl
  control with the fleet scene, and the fleet diagram.
- TODO: invention 4 (lookup-in-storage) and 6 (context-cartridges) have no experiment; each shows
  "TODO: no falsification experiment yet."
- old addresses: /design/<slug> redirects (308) to /design#<slug>.

## How to reach it

- http://localhost:4317/design ; header link "Design"; the pager from /survey.
- http://localhost:4317/design/wired-ternary (redirect to the anchor).

## How to check it

Static: the build (every RISK quote must still be in the design doc).

Runtime:

```sh
curl -s localhost:4317/design | grep -o '<strong>TODO: no falsification experiment yet.</strong>' | wc -l     # 2 (bare text also matches the inlined RSC payload)
curl -s localhost:4317/design | grep -o 'class="chapter chapter-split"' | wc -l           # 7
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:4317/design/rom-core     # 308 .../design#rom-core
heavy node tools/site/peek.ts --url http://localhost:4317 --path /design --selector ".stage" --wait 3000
```

Proves it when: 2 TODOs, 7 part chapters, the redirect lands on the anchor, and the stage peeks
show the fleet, wired, corerope and fleet-with-Amdahl scenes lit (not black).

## Gotchas

- The part list and section prefixes are in site/lib/inventions.ts. If a heading in the design doc
  is renamed, the build fails loudly (section() throws); fix the prefix, not the doc.
- "Seven parts" is the design doc's own count: six numbered inventions plus the fleet.
