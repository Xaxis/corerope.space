# The survey

The survey on one page: the two baselines and the metric, the four cost terms with the memory-wall
3D scene, every lever family with what is measured, the multiplier budget, and the honest odds.

<!-- covers: page:/survey, page:/baseline, page:/levers -->

## Sub-features

- intro: the survey's title, its opening sentence, three stats (known levers vs 2024 and vs late
  2026, in dollars and energy; the market-trend range).
- `#baseline`: tokens per task (4.4x spread) and the market trend chart.
- `#terms`: the four terms, the `memory` WebGL scene, the decode energy stack and the batch crossover
  chart (keyboard and pointer crosshair).
- `#levers`: one card per lever family (8) from data/levers.json, each lever with its gain, quality
  cost, overlaps and evidence, linking to the survey section and the matching note.
- `#budget`: the budget chart with tabs "Against B2026" and "Against B2024".
- `#odds`: the honest odds and the conclusion, quoted.
- old addresses: /baseline and /levers redirect (308) to /survey#baseline and /survey#levers.

## How to reach it

- http://localhost:4317/survey ; header link "Survey"; the pager from the home page.
- http://localhost:4317/baseline , http://localhost:4317/levers (redirects).

## How to check it

Static: `pnpm typecheck`, `pnpm lint`, the build.

Runtime:

```sh
curl -s localhost:4317/survey | grep -o 'class="family"' | wc -l      # 8
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:4317/levers   # 308 .../survey#levers
heavy node tools/site/interact.ts --url http://localhost:4317    # B2024 tab and the /levers redirect
heavy node tools/site/peek.ts --url http://localhost:4317 --path /survey --selector ".family, .fig, .stage" --wait 2500
```

Proves it when: 8 families; the redirect prints 308 to /survey#levers; interact prints ok for "the
old /levers address lands on the survey" and "the B2024 tab shows Table A's levers"; the peeks show
the families' rows legible and the HBM scene lit.

## Gotchas

- Every lever's "Evidence" value is the survey's own label (vendor, independent, derived). Keep it.
- The family verdict is the text after the colon in the survey's heading; a heading without one
  shows the name only.
