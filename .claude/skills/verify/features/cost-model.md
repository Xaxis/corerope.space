# The cost model

An interactive calculator that runs the same arithmetic as experiments/cost-model/costmodel.py,
with every assumption as a slider, two scenarios, three presets and a shareable URL.

<!-- covers: page:/cost-model -->

## Sub-features

- scenarios: "Via-programmed fabric" (default: ~$3M NRE, 0.05% GPU fallback) and "New chip per
  model" (costmodel.py as written: ~$40M NRE, 0.1%).
- presets: Pessimistic, Central, Optimistic, and "Reset to <preset>" once a slider moves.
- sliders: 20 parameters in groups, linear or log scale, each with help text and the preset's value
  shown when changed.
- results: four tiles (energy and dollars, per task and per token) with log meters against the
  1000x line, the Amdahl cap text, the $/M-tokens stack by term, and facts (mJ per token, tok/s).
- url-state: ?scenario=, ?case= and any changed parameter; invalid or out-of-range values are ignored.
- phone bar: a sticky bottom bar with the per-task answers under 980 px.
- chapters below (template, with a sticky subnav): `#budget` the multiplier budget and its range
  chart, `#dollars` the cost breakdown, `#amdahl` the fleet WebGL scene with the Amdahl control
  (0%, 0.05%, 0.1%, 1%, 5% on GPUs; recorded gains) and the Amdahl curve, `#code` costmodel.py.

## How to reach it

- http://localhost:4317/cost-model ; header link "Cost model"; home "Run the cost model" button.
- Shared links: http://localhost:4317/cost-model?case=optimistic ,
  http://localhost:4317/cost-model?scenario=as_written , http://localhost:4317/cost-model?gpu_share=0

## How to check it

Static: `pnpm test` (site/test/costmodel.test.ts: every golden output bit-exact with Object.is,
headline multipliers 749/263/801/203, Amdahl 1196/92/20, PARAMS match, presets reachable by the
sliders). `make check` also proves costmodel.py still prints RESULTS.md.

Runtime:

```sh
heavy node tools/site/interact.ts --url http://localhost:4317
heavy node tools/site/shots.ts --url http://localhost:4317 --out out/shots --only /cost-model
```

Proves it when: interact prints ok for "opens on the central fabric case: 749x", "dollars per
task, central: 263x", "no GPU fallback gives 1,196x", "the URL carries the change", "the
pessimistic preset gives 15x", "a shared link opens its case (optimistic: 46,009x)" and "the
new-chip scenario gives 89x dollars per task", and "the calculator keeps a link's #anchor in the
address bar". Then Read the cost-model shots at desktop and phone.

## Gotchas

- The calculator is a client component; its first paint is the central case and the URL is read
  after hydration. A check right after load can see 749x before a shared link applies: wait for
  network idle and a tick (interact.ts waits 150 ms).
- The calculator writes its case to the address bar with replaceState, keeping the #anchor, and only
  when the address would change. Next answers every replaceState with a router transition that
  re-renders the calculator, so an unconditional write kept the page rewriting its history 3 to 6
  times after one click, and a test's next goto could land in the middle of it.
- Changing costmodel.py means `make data` (regenerates data/costmodel-golden.json) and the same change
  in site/lib/costmodel.ts, or `pnpm test` fails.
