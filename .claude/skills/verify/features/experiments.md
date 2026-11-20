# Experiments

What was tested (gate counts, the SPW add-count model, the cost model), re-run for this site, and
the seven experiments that would confirm or kill the design, as a roadmap with pass bars.

<!-- covers: page:/experiments -->

## Sub-features

- repro: stat tiles for what was reproduced (15 of 15 gate counts, the SPW ratios, costmodel.py
  output) and a callout on how to reproduce (`make venv synth data check`).
- results: the gate-count bar chart and the SPW line chart, with a gap callout (wire energy and ABC
  left out).
- roadmap: seven experiment cards from data/roadmap.json, each with its question, pass bar, fail
  meaning and links to the inventions it tests.
- program: the survey's experiment program section, and the experiment scripts as code listings.

## How to reach it

- http://localhost:4317/experiments ; header link "Experiments"; experiment chips on /design.

## How to check it

Static: `make check` (the numbers this page shows are the ones it reproduces), the build.

Runtime:

```sh
curl -s localhost:4317/experiments | grep -o 'class="exp[ "]' | wc -l     # the seven cards
curl -s localhost:4317/experiments | grep -o '15 of 15'
heavy node tools/site/peek.ts --url http://localhost:4317 --path /experiments --selector ".fig" --scheme dark
```

Proves it when: the cards count is 7 and "15 of 15" prints; the dark peek PNGs show the gate bars
and SPW lines legibly on the dark surface.

## Gotchas

- "15 of 15" comes from data/gates.json's `reproduced` flags. Without Yosys logs (no `make synth`),
  `make data` writes null and the page says the counts were not re-run. That is correct, not a bug.
