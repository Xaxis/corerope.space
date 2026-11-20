# The data pipeline

The scripts that re-run the experiments, write data/*.json for the charts, and prove the recorded
results in experiments/RESULTS.md reproduce.

<!-- covers: job:make-data, job:make-synth, job:make-check -->

## Sub-features

- make-synth: scripts/synth.sh re-runs the 15 wired-layer syntheses with Yosys 0.71 (yowasp-yosys)
  into build/synth/.
- make-data: scripts/data/*.py write amdahl, cost-breakdown, costmodel, costmodel-golden,
  decode-energy, gates, levers, market-trend, multipliers, roadmap, spw and tokens-per-task JSON,
  reading the research markdown and running costmodel.py and adds.py.
- make-check: scripts/check_results.py compares costmodel.py's output with RESULTS.md character for
  character, the SPW ratios and the gate counts, then runs the site's tests.

## How to reach it

- `make venv` once, then `heavy make synth`, `make data`, `heavy make check` from the repo root.

## How to check it

Static: `pnpm test` reads data/costmodel-golden.json.

Runtime:

```sh
make data && git status --short data/      # nothing: the committed data is what the scripts write
heavy make check 2>&1 | grep -E '^(ok|FAIL|skip)'
```

Proves it when: `git status` shows no change under data/, and make check prints three "ok" lines
(cost model, SPW model, gate counts) and no FAIL or skip.

## Gotchas

- Without .venv, the Makefile falls back to python3; spw.py needs numpy and is skipped (reported as
  skip, never as ok).
- Gate counts need build/synth logs from `make synth` (minutes, CPU-heavy: run under heavy). Without
  them gates.json records null for `reproduced` and make check says skip.
