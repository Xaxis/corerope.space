---
name: verify
description: Verify corerope.space (a static Next.js site rendered from research markdown, plus a Python data pipeline and a Vercel deploy script). Has the feature map of where every page, metadata route, pipeline step and deploy command lives, how to launch and health-check the site, and a proven recipe for checking each feature. Use to prove a change in this repo works, to find where a feature lives, or to see what a change could break.
---

# Verify corerope.space

`FM=~/.claude/claude-core/bin/featuremap`

- **Where does a feature live?** Look it up in `features.json` (`id`, `entry`, `reach`,
  `tests`), then read `features/<area>.md` for its recipe.
- **What did my change touch?** `$FM affected` (add `--since <base>` on a branch).
  Every feature it lists is in scope. Pages read `research/` and `data/` at build time, so a change
  to a research file or a data script reaches every page that renders it even when the import graph
  does not say so: rebuild and re-shoot.
- **Keeping it current:** when you add, rename, move or remove a feature, run
  `$FM generate --write`, update the matching `features/<area>.md`, and confirm
  `$FM check` exits 0. Commit this with the feature change.

## Static checks

| Check | Command | Proves | Baseline |
|---|---|---|---|
| typecheck | `pnpm typecheck` | route types and TypeScript across site/ | passes, 2s |
| lint | `pnpm lint` (= `make lint`) | Biome over site/ and tools/, and no em dash in any tracked file | passes, 1s |
| test | `pnpm test` (= `make test`) | the TS cost model equals costmodel.py on every golden output (`Object.is`), presets, Amdahl cap; every 3D scene builds and runs every step with finite geometry (test/scenes.test.ts) | passes, 20 tests, 5s |
| build | `heavy pnpm build` | all 31 routes render statically from research/ and data/ | passes, about 30s |
| make check | `heavy make check` | costmodel.py output equals RESULTS.md; SPW ratios and 15 Yosys gate counts reproduce; then `pnpm test` | passes (3 ok, none skipped once `make venv synth data` ran), about 10s |

Under `heavy`, add queue wait when the box is busy (minutes on 2026-11-20).

Known pre-existing failures: none.

## Launch

The site is static: build it, then serve the build. Port 4317 belongs to this project.

```sh
cd site && ~/.claude/claude-core/bin/heavy pnpm build
npx next start -p 4317 > /tmp/corerope-4317.log 2>&1 & echo $! > /tmp/corerope-4317.pid
```

(Claude Code's guard blocks a trailing `&`: run `cd site && exec npx next start -p 4317` with the
Bash tool's `run_in_background` instead, and stop it with TaskStop.)

Ready when: `curl -sf localhost:4317/ >/dev/null` succeeds.
Needs: nothing. No env vars, no services. `CORE_BUILD` sets the build marker (deploy.sh passes the
commit); without it the marker says `dev`. Never shoot or drive `next dev`: with a headless browser
attached it recompiles and reloads about once a second, so pages navigate away mid-check. Build and
`next start`.

## Doctor

```sh
curl -s localhost:4317/ | grep -o '<meta name="corerope-build" content="[^"]*"' && ss -ltnp 'sport = :4317' | grep -o 'pid=[0-9]*'
```

The marker proves it is this site (`dev` locally, a commit on Vercel), and the pid is the server
this run started. If the page is stale, the server is serving an older build: rebuild, then restart.

## Drive

- **Every page, both themes, both widths:** `heavy node tools/site/shots.ts --url http://localhost:4317 --out out/shots`
  (exit 0: all 20 routes answer as listed, no sideways scroll at 390 px, no serious or critical axe
  findings in light or dark). Add `--only /cost-model` for one page. Then look at the PNGs of what
  you changed: Read them. Pages over 16,384 px tile in a full-page shot; use peek for those.
- **One part of a page:** `heavy node tools/site/peek.ts --url http://localhost:4317 --path /survey --selector ".fig" [--scheme dark] [--width 390] [--wait 2500]` (use --wait for 3D stages; peek waits for `load`, not network idle)
  writes one PNG per matching element into out/peek/.
- **Interactions:** `heavy node tools/site/interact.ts --url http://localhost:4317` (exit 0: 27 checks
  on the calculator, presets, shared links, tabs, the 3D stages and story, scene step pickers, stage
  release, tooltips, theme, reduced motion and the phone).
- **Stepped 3D scenes:** `heavy node tools/site/scenes.ts --url http://localhost:4317 --path /design [--only N] [--scheme dark]`
  chooses every step of every `.stage-steps` and writes one PNG per step into out/scenes/, with
  page errors and the live canvas count (exit 0: every step `ready`).
- **Live site:** the same three tools with `--url https://corerope.space` (or the vercel.app domain).

## Evidence

- Record the command and its decisive output: status plus body, the rendered text, the
  exit code, or the row read back.
- Capture both the action and the resulting state; check side effects through a
  second, read-only view.
- If a path is unreachable, name the missing precondition and prove the nearest
  real path. Never report it as verified.

## Cleanup

`kill $(cat /tmp/corerope-4317.pid)` (or TaskStop for a background task). Kill only what this run
started: other sessions' servers run on this machine. out/ is gitignored; keep evidence there.
