# Experiments and risks

What was tested and re-run for this site, the seven experiments that would confirm or kill the
design, what could kill it, the known gaps, each note's open questions, the GPU program, prior art
and the scripts.

<!-- covers: page:/experiments, page:/risks -->

## Sub-features

- intro: the design doc's experiments heading and opening, stats (7 experiments, 0 model-quality
  claims tested, the parts with no experiment named).
- `#run`: what was reproduced (15 of 15 gate counts, SPW ratios, cost model exact), how to
  reproduce, the gate and SPW charts, the wire-energy gap callout.
- `#roadmap`: seven experiment cards (tests, pass bar, if it fails, links to /design#<part>).
  Experiments 1, 6 and 7 also carry a "derived" line (site/lib/failures.ts): the cost model run
  with the failure the doc states as one of its inputs (1: 0.5 pJ per weight-operation, read from
  "Above 0.5 pJ"; 6: the pessimistic preset's tokens per task; 7: the new-chip scenario, ~$40M NRE)
  and the rest central, with a link that opens the calculator in that case. The same cards appear
  on /design.
- `#risks`: the design doc's "What could kill it", verbatim.
- `#gaps`: the four known gaps from 00-BRIEF.md as gap callouts.
- `#open`: each note's Gaps sections in details blocks.
- `#program`: the survey's four-phase GPU program. `#prior`: prior art. `#scripts`: the scripts.
- old address: /risks redirects (308) to /experiments#risks.

## How to reach it

- http://localhost:4317/experiments ; header link "Experiments"; the pager from /cost-model.
- http://localhost:4317/risks (redirect).

## How to check it

Static: `make check` (the numbers this page shows are the ones it reproduces), the build.

Runtime:

```sh
curl -s localhost:4317/experiments | grep -o 'class="exp"' | wc -l     # 7
curl -s localhost:4317/experiments | grep -o '15 of 15' | head -1
curl -s localhost:4317/experiments | grep -o 'No published measurement of how the efficiency levers compound together at frontier scale\|Gate counts exclude wire energy\|All model-quality claims of the design are untested\|Several 2026 figures are vendor claims' | sort -u | wc -l   # 4
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:4317/risks    # 308 .../experiments#risks
curl -s localhost:4317/experiments | grep -o '<p class="exp-model">' | wc -l   # 3
cd site && npx vitest run test/failures.test.ts                                 # 4 pass
```

Proves it when: 7 cards, "15 of 15", 4 gaps, the redirect lands on #risks, 3 derived failure lines
(experiment 7's reads about 89x lower cost, the doc's "~90x"), and the failure tests pass. interact
checks that experiment 7's "Open this case" link opens the calculator on the new-chip scenario.

## Gotchas

- failures.ts reads each value from the doc's "if it fails" wording or the presets and throws at
  build time if the wording drifts ("failures: experiment N's ... no longer says ...").
- Experiment 6's case lowers the gain by less than the doc's "further 2.25x": the model keeps the
  GPU fallback at baseline cost whatever the tokens. The card shows the model's number, labelled
  derived; the doc's sentence is not changed.
- "15 of 15" comes from data/gates.json's `reproduced` flags. Without Yosys logs (no `make synth`),
  `make data` writes null and the page says the counts were not re-run. That is correct, not a bug.
- The gaps are read from 00-BRIEF.md's "Known gaps" list. Editing that list changes this page.
