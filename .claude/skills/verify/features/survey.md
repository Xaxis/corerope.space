# The survey: baseline and levers

The survey rendered: why the unit is cost per solved task and which baseline, then every efficiency
lever with its gain, quality cost and overlaps, and the multiplier budget against B2024 and B2026.

<!-- covers: page:/baseline, page:/levers -->

## Sub-features

- baseline: the survey's baseline sections verbatim, with three figures: tokens per task at
  near-equal scores (4.4x spread), where a 2024 token's energy goes (~9.3 J stack), and the market
  trend ranges (14x to 471x).
- levers-intro: the four cost terms and the batch crossover line chart (crossover batches 18, 45, 90,
  180 against 0.073 J of arithmetic per token), with keyboard and pointer crosshair.
- levers-sections: eight lever sections, each with lever cards (gain, quality cost, overlaps,
  evidence) and the survey's prose, plus a link to the matching note.
- lever-budget: the budget chart with tabs "Against B2026" and "Against B2024", hollow dots for the
  naive products, and tables A and B.
- toc: the "On this page" list with scroll-spy (a details block on phones).

## How to reach it

- http://localhost:4317/baseline and http://localhost:4317/levers ; header links "Baseline" and
  "Levers"; home page cards 1 and 2.

## How to check it

Static: `pnpm typecheck`, `pnpm lint`, the build.

Runtime:

```sh
curl -s localhost:4317/baseline | grep -o 'class="fig-title"' | wc -l    # 3
curl -s localhost:4317/levers | grep -o 'Batching hides weight reads only until arithmetic binds\|Against B2024 (dense 405B on H100)' | sort -u
heavy node tools/site/interact.ts --url http://localhost:4317    # "the B2024 tab shows Table A's levers"
heavy node tools/site/peek.ts --url http://localhost:4317 --path /levers --selector ".fig"
```

Proves it when: 3 figures on /baseline; both strings on /levers; interact's tab check is ok; the
peek PNGs show the batch chart with four lines meeting the dashed arithmetic line and the budget
chart with three blue/orange overall rows.

## Gotchas

- /levers is about 21,000 px tall at 1440 wide: its full-page shot tiles. Use peek for the charts.
- The evidence chips (independent, vendor, derived) come from the notes' labels via
  site/lib/markdown.ts; a renderer change can drop them silently. grep for `class="ev` in the HTML.
