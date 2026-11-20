# Home

The landing page: the one-line claim, the headline numbers with how sure they are, the core rope
story with its drawing, and where to go next.

<!-- covers: page:/ -->

## Sub-features

- hero: the claim, the design doc's summary opening, a "Status: a design, not a result" pill, three
  actions (design, cost model, research) and the decorative animated rope (aria-hidden).
- numbers: four stat tiles (749x energy, 263x dollars, ~35x levers vs B2026, 92x at 1% GPU fallback)
  and the multiplier range chart (dot and whisker, log axis, dashed 1000x target, tooltips).
- name: the brief's core rope story (cut before its "Use this story" instructions) and the
  two-panel illustration (`site/components/CoreRope.tsx`).
- layers: the survey card with a table of B2024 and B2026 central estimates; the design card with
  the seven parts.
- next: six cards to the other pages and a note on where numbers come from.

## How to reach it

- http://localhost:4317/ ; the logo in the header from any page.

## How to check it

Static: `pnpm typecheck`, `pnpm lint`; the build renders it. No unit test.

Runtime:

```sh
curl -s localhost:4317/ | grep -o 'Making a frontier-quality LLM roughly 1000x cheaper to run\|Status: a design, not a result\|Central case: 749x less energy and 263x lower cost per task' | sort -u
heavy node tools/site/shots.ts --url http://localhost:4317 --out out/shots --only /
heavy node tools/site/interact.ts --url http://localhost:4317   # includes the home chart tooltip
```

Proves it when: all three strings print; shots exits 0 (no sideways scroll at 390 px, axe clean,
light and dark); interact prints "ok   hovering a chart row shows its tooltip: 749x, 15x to 46,009x".
Then Read out/shots/home-desktop-light.png and home-mobile-dark.png: the rope drawing shows wires
through and around five cores, and the chart's labels do not collide.

## Gotchas

- Every number here is read from data/multipliers.json, data/levers.json and data/amdahl.json. If a
  number changes, it changed in the pipeline (`make data`), not in page.tsx.
- The source link under the hero points at the design doc's summary lines; if the summary moves,
  the link follows (it is computed from the markdown positions).
