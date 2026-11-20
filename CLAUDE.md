# CLAUDE.md: Corerope

corerope.space: an open research program on making a frontier-quality LLM roughly 1000x cheaper to
run, and the static site that presents it. The research files are the source of truth; the site
renders them and charts data generated from them. README.md has the layout and how to reproduce.

## Rules that shape every change

- **Nothing invented.** Every number, source and result on the site comes from `research/`,
  `experiments/` or `data/`. If something is missing, the page shows a visible TODO (as it does for
  inventions 4 and 6, which have no falsification experiment). Never hand-copy a number into a
  component: read it from `data/*.json` or the markdown.
- **No em dashes anywhere** (00-BRIEF.md, "Writing style"): research text, docs, code and UI copy.
  `pnpm lint` runs `tools/no-em-dash.mjs`. Plain language; numbers with units.
- **Evidence labels survive.** The notes mark independent measurements, vendor claims and derived
  estimates; the renderer turns them into chips (`site/lib/markdown.ts`). Keep them.
- **Every page links to its source lines and every chart to its data and script.** `SourceLink`,
  `PageHead` and `Figure`'s provenance line do this; a new page or chart uses them.
- **Status is honest.** The design is a design, not a result. Nothing on the site may imply a
  model-quality claim was tested.
- **Chart data comes from `make data`** (scripts/data/*.py), never edited by hand. `make check`
  must stay green: costmodel.py output equals RESULTS.md, the SPW ratios and the 15 gate counts
  reproduce.
- **The calculator is an exact port.** `site/lib/costmodel.ts` mirrors
  `experiments/cost-model/costmodel.py`; `site/test/costmodel.test.ts` compares every output with
  the Python's (`data/costmodel-golden.json`, written by `make data`) using `Object.is`. Change both
  together and regenerate the golden file.

## Working here

- Port 4317 for this project's local server (`npx next start -p 4317` in site/ after a build).
- Heavy work goes through `~/.claude/claude-core/bin/heavy`: `make synth`, builds, and every
  browser tool (`tools/site/shots.ts`, `interact.ts`, `peek.ts`). Chromium stays on SwiftShader.
- Gate before committing: `pnpm lint && pnpm typecheck && pnpm test && make check`, a build, then
  `tools/site/shots.ts` (every page, desktop and phone, light and dark, axe, no sideways scroll) and
  `tools/site/interact.ts` against the local server. Look at the shots of what you changed.
- Deploy: `heavy tools/site/deploy.sh` uploads the committed tree to the Vercel project `corerope`
  (team xaxis-projects) and proves the live domains serve that commit. Pushing does not deploy.
- `.claude/skills/verify/` says how to check each feature; update it in the same commit as a
  feature change.
- License: not chosen yet (README.md). Do not add a LICENSE file without the owner's say.
