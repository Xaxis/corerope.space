# The design

The seven parts of the Corerope stack on one page: where the remaining 1000x hides, then each part
with its summary, how it could fail, its falsification experiment (or a visible TODO), and its
evidence. The page has seven WebGL stages, four of them with a step picker.

<!-- covers: page:/design, page:/design/:slug -->

## Sub-features

- intro: the design doc's title and summary, the "A design, not a result" status, stats (749x,
  263x, parts and how many lack an experiment).
- subnav: sticky chips for the overview and the seven parts, with the current one marked.
- `#where`: the headroom table and the energy ladder.
- one split chapter per part (`#split-mind`, `#wired-ternary`, `#rom-core`, `#lookup-in-storage`,
  `#tokens-per-task`, `#context-cartridges`, `#two-tier-fleet`): the summary (for a stepped part,
  less the sentences its first step shows under the stage: FIRST_STEP in page.tsx), a "Why it could fail"
  style quote (RISK in site/app/design/page.tsx), the experiment cards from data/roadmap.json, and
  the evidence: the fleet scene (split mind), the corerope scene (ROM core), gate and SPW charts,
  the tokens chart (with a key: accent bars have an index score in the note, grey ones do not),
  the Amdahl control with the fleet scene, and the fleet diagram (it stacks whenever its own box
  is under 820 px wide, so in this page's column too). A list or table a part spells out keeps its
  bold lead-in ("The training contract.").
- stepped scenes (site/components/StageSteps.tsx): a stage with a radio picker ("Show in the
  scene") and, under it, the research's words for the chosen step (`.stage-steps-body`,
  aria-live). Wired ternary (3 steps, `wired`), lookup-in-storage (3, `storage`: every row
  crosses, summed on the die, two levels), tokens per task (4, `tokens`: the long chain, joule-priced
  RL prunes the hot beads, a compiled skill folds a stretch into a cube, latent runs turn blue with
  white checkpoints), context cartridges (3, `cartridges`: re-reading the corpus, a cartridge docks
  and the state ring fills at once, snapshots on a session timeline). The three new scenes carry
  "An illustration of the mechanism: the counts and lengths in the scene are not data." On a phone
  the picker is two even columns, an odd last step spanning both.
- stage lifetime (site/components/three/Stage.tsx): a stage starts within 400px of the screen and
  is released (canvas removed, WebGL context given back) beyond 1600px, so this page of seven
  stages holds only the near ones.
- TODO: invention 4 (lookup-in-storage) and 6 (context-cartridges) have no experiment; each shows
  "TODO: no falsification experiment yet."
- old addresses: /design/<slug> redirects (308) to /design#<slug>.

## How to reach it

- http://localhost:4317/design ; header link "Design"; the pager from /survey.
- http://localhost:4317/design/wired-ternary (redirect to the anchor).

## How to check it

Static: the build (every RISK quote must still be in the design doc).

Runtime:

```sh
curl -s localhost:4317/design | grep -o '<strong>TODO: no falsification experiment yet.</strong>' | wc -l     # 2 (bare text also matches the inlined RSC payload)
curl -s localhost:4317/design | grep -o 'class="chapter chapter-split"' | wc -l           # 7
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' localhost:4317/design/rom-core     # 308 .../design#rom-core
heavy node tools/site/scenes.ts --url http://localhost:4317 --path /design --scheme dark   # every step of the 4 stepped scenes -> out/scenes/
heavy node tools/site/peek.ts --url http://localhost:4317 --path /design --selector ".stage" --wait 3000
cd site && npx vitest run test/scenes.test.ts                                                 # every scene builds and runs every step, no GPU
```

Proves it when: 2 TODOs, 7 part chapters, the redirect lands on the anchor; scenes.ts prints
`ready` for all 13 steps, exits 0, and "live canvases now" stays at 1 or 2 (far stages released);
the PNGs show each step differently (storage: pale rows crossing the bus in step 0, a ring over the
stack in step 1, the blue DRAM in step 2; tokens: the chain shorter each step; cartridges: the
ring filling slowly, then at once in a cartridge's colour, then snapshots on the timeline); the
peeks show the other stages lit (not black). interact.ts covers the picker, the release, and a
reader's pause surviving the rebuild.

## Gotchas

- The subnav shares the TOC's useSectionInView: a chapter counts as reached where a jump to it stops
  (scroll padding plus the chapter's scroll margin). interact checks "a chapter link marks the chapter
  it jumps to".
- A scene that throws on its first frame leaves the stage `data-status="failed"` and logs
  `stage "<name>" failed to start:` with the error in the browser console (scenes.ts prints it).
  test/scenes.test.ts runs every scene without a GPU and catches most of these first.
- Step captions are quotes (`quote()`), so a reworded design doc fails the build, as RISK does.

- The part list and section prefixes are in site/lib/inventions.ts. If a heading in the design doc
  is renamed, the build fails loudly (section() throws); fix the prefix, not the doc.
- "Seven parts" is the design doc's own count: six numbered inventions plus the fleet.
