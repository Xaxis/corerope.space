# Risks and prior art

What could kill the design, the brief's known gaps in the evidence, honest odds, each note's own
gaps, and the prior art with sources.

<!-- covers: page:/risks -->

## Sub-features

- risks: the design doc's risk list verbatim.
- gaps: the four known gaps from 00-BRIEF.md as gap callouts.
- odds: the survey's "honest odds" section.
- note-gaps: each research note's Gaps section in a details block.
- prior-art: the prior art and sources section, links intact.

## How to reach it

- http://localhost:4317/risks ; header link "Risks"; home card 6.

## How to check it

Static: the build.

Runtime:

```sh
curl -s localhost:4317/risks | grep -o 'No published measurement of how the efficiency levers compound together at frontier scale\|Gate counts exclude wire energy\|All model-quality claims of the design are untested\|Several 2026 figures are vendor claims' | sort -u | wc -l   # 4
heavy node tools/site/shots.ts --url http://localhost:4317 --out out/shots --only /risks
```

Proves it when: 4 gaps found; shots exit 0.

## Gotchas

- The gaps are read from 00-BRIEF.md's "Known gaps" list. Editing that list changes this page.
