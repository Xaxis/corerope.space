# Corerope: build brief for Claude Code

You are building **corerope.space**, a website for an open research project, plus the open-source repository behind it. Everything the site says comes from the research files in this bundle. Do not invent numbers, sources or results; if something is missing, leave a visible TODO instead.

## What the project is

Corerope is an open research program on how to make a frontier-quality LLM roughly **1000x cheaper to run** (energy and dollars per solved task). It has two layers:

1. **The survey** (`research/01-report-path-to-1000x.md` plus the six notes in `research/notes/`). This maps every known efficiency lever as of November 2026: low-bit numerics, MoE, attention and KV cache, decoding and test-time compute, distillation and cost trends, hardware and serving. Its conclusion: against a 2024 baseline 1000x is mostly the market trend, but against the late-2026 frontier the known levers give only about 35x, because most of them shrink the same bytes moved per token.
2. **The design** (`research/02-corerope-design.md`). This invents the stack needed to close the gap: a small ternary reasoning core wired directly into silicon, a huge lookup memory in storage, a training contract that lets the core stay frozen for years, a via-programmed fabric, joule-priced RL, context cartridges, and a two-tier fleet. Its cost model's central case is ~749x less energy and ~263x lower cost per solved task, with a range of 15x to 46,000x. **Nothing in the design is proven at scale**, and the site must say so plainly.

## The name

The Apollo Guidance Computer stored its software in **core rope memory**: each bit was set by whether a wire was threaded through a magnetic core or around it, so the program was literally woven into the hardware. Corerope does the same with a neural network's weights: in wired-weight silicon a weight is a connection to an adder's plus input, its minus input, or nothing. Use this story on the home page (one short section, with a simple illustration of a wire threading through or around cores). Do not use NASA logos or copyrighted photos; draw it.

## Repository layout (suggested)

```
corerope/
  README.md               project summary, status, how to reproduce, license
  research/               the markdown in this bundle, kept as the source of truth
    01-report-path-to-1000x.md
    02-corerope-design.md
    notes/*.md
  experiments/
    wired-layers/         gen.py, gen2.py, run.sh, run2.sh (Yosys gate counts)
    spw-model/            adds.py (shared partial-sum add-count model)
    cost-model/           costmodel.py (energy and dollar multipliers)
    RESULTS.md            the recorded outputs below
  site/                   the website, reading its content from ../research
  data/                   JSON extracted for the charts (generated, with a script)
```

Licenses (chosen Nov 23, 2026): Apache-2.0 for code, CC BY 4.0 for the research text and data. README.md says which paths are which.

## Website requirements

- **Content is the research files.** Render the markdown faithfully, keep every source link, and keep the distinction between independent measurements, vendor claims and derived estimates (the notes label these; preserve the labels).
- **Writing style:** no em dashes anywhere (use commas, colons, parentheses or separate sentences). Plain, specific language. Numbers with units.
- **Every page links to its source file in the repo** ("View source" / "Edit on GitHub"), and every chart links to the data and script that produced it.
- **Pages (suggested):**
  1. Home: the one-line claim, the core rope story, the headline chart, and an honest status ("design, not a result").
  2. The baseline: why "per solved task" and which baseline (B2024 vs B2026), with the market-trend numbers.
  3. The levers: one section per lever from the survey, each with state of the art, measured gains, quality cost, and how it overlaps with others.
  4. The design: the seven inventions, each as its own page or section, with its falsification experiment.
  5. The cost model: an **interactive calculator** (port `costmodel.py` to TypeScript exactly, with sliders for each assumption and pessimistic/central/optimistic presets). Show per-task and per-token multipliers for energy and dollars, and the Amdahl fallback cap.
  6. Experiments: what was run (gate-count results, SPW model) and the seven next experiments with pass bars, as a roadmap.
  7. Risks and prior art, with sources.
- **Visualizations (crisp, flat, accessible, light and dark themes):**
  1. Multiplier range plot: dot-and-whisker on a log axis, 1x to 100,000x, dashed 1000x target. Data in the design doc's multiplier section.
  2. Fleet architecture diagram: Task -> Router -> Tier A wired core -> Tier B -> GPU fallback, with the memory tier below Tier A (spec in the design doc).
  3. Amdahl curve: energy multiplier per task vs GPU fallback share (0% 1,196x; 0.05% 749x; 0.1% 545x; 1% 92x; 5% 20x, from the cost model, central case). Generate more points by running the model.
  4. Gate-count bar chart: gates per weight for the six synthesized designs.
  5. SPW saving vs layer size and group size (from adds.py output below).
  6. Cost breakdown of a central-case million tokens: capital ~67%, NRE ~17%, memory storage ~10%, electricity ~6%.
  7. Where the energy goes in a decode step (from the hardware notes: H100 11.68 pJ per HBM bit vs 0.52 pJ per FLOP).
  8. Lever map from the survey: each lever's measured multiplier and what it overlaps with.
  9. Core rope illustration for the home page.
- Generate chart data from the scripts where possible (a `make data` step), not by hand-copying numbers.

## Known gaps to flag on the site

- No published measurement of how the efficiency levers compound together at frontier scale.
- Gate counts exclude wire energy and used Yosys without ABC optimization.
- All model-quality claims of the design are untested.
- Several 2026 figures are vendor claims or secondary sources; the notes mark them.

## Recorded experiment results

See `experiments/RESULTS.md` in this bundle.
