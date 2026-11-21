# Home: the story

The landing page tells the whole program as one scrolling story: a full-bleed 3D core rope, the
headline numbers, then seven numbered chapters, four of them scroll-driven 3D scenes.

<!-- covers: page:/ -->

## Sub-features

- hero: `section.hero3d` with the `corerope` WebGL scene behind the claim, the design doc's summary
  sentence (quoted verbatim by `quote()`), the "A design, not a result" pill, two actions, a pause
  button, and the brief's "Why Corerope" paragraph.
- numbers: four stats (749x, 263x, ~35x levers vs B2026, 92x at 1% GPU fallback).
- chapter 1 `#today`: a StoryChapter on the `memory` scene (HBM stacks streaming bits to a die);
  three steps, the third turns the die into wires. Step 2 has the HBM-bit vs FLOP energy bars.
- chapter 2 `#levers`: survey quotes, B2024/B2026 stats, the lever budget chart.
- chapter 3 `#wires`: StoryChapter on the `wired` scene (rails, +1/-1 vias, shared partial sums,
  zeros that cost nothing).
- chapter 4 `#fleet`: StoryChapter on the `fleet` scene; the last step holds the Amdahl control.
- chapter 5 `#moves`: StoryChapter whose steps each name their own scene (StoryStep.scene): memory
  that computes (`storage`, step 1), cartridges (`cartridges`, step 1), fewer tokens (`tokens`,
  step 3). The stage switches scene with the active step (`data-scene` on `.stage`) and fades in.
- chapter 6 `#numbers`: the multiplier budget quotes and the range chart with tooltips.
- chapter 7 `#tests`: the seven experiments with their pass bars; counts parts with no experiment.
- pager to /survey.

## How to reach it

- http://localhost:4317/ ; the logo in the header; "The story" first in the footer list.

## How to check it

Static: `pnpm typecheck`, `pnpm lint`; the build fails if any quoted sentence left the research.

Runtime:

```sh
curl -s localhost:4317/ | grep -o 'Making a frontier-quality LLM roughly 1000x cheaper to run\|A design, not a result\|Central case: 749x less energy and 263x lower cost per task' | sort -u
heavy node tools/site/interact.ts --url http://localhost:4317
heavy node tools/site/peek.ts --url http://localhost:4317 --path / --selector "main > section" --wait 2500
```

Proves it when: the three strings print; interact prints ok for "the hero's WebGL stage is
drawing", "the pause button stops the animation", "scrolling the story activates its step", "the
story's stage loads when it comes into view", "a story step with its own scene switches the stage
to it", "hovering a chart row shows its tooltip" and "with reduced motion the hero is a still
frame". Then Read out/peek/home-0-light-1440.png (the rope is lit
right of the text, cores flash) and a story section (the stage sits beside the active step).

## Gotchas

- Stages load three.js lazily when they near the viewport. shots.ts shows every stage dark (it
  resizes the page to capture it, and no stage has drawn yet); use story.ts or peek, which scroll
  each section into view and wait.
- Story steps are picked by an IntersectionObserver on a thin band at mid-screen; a step scrolled
  only to the top of the screen is not active yet.
- The stage is always dark (#0b0a09), in both themes, by design.
- Quoted research text comes from `quote(file, heading, start, n)` in site/lib/content.ts. If the
  research changes, the build fails naming the sentence; update the start words, never the research.
