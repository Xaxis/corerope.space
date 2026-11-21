# The research library

Every research file rendered whole, with a table of contents, evidence chips and every source link,
plus an index of every source cited across the files.

<!-- covers: page:/research, page:/research/[slug] -->

## Sub-features

- index: document cards for the survey, the design doc, the six notes and the recorded results.
- sources: "Every source cited" (site/lib/sources.ts): each link once, grouped under its site,
  named by the longest text any citation gives it, with the address after the host (so links the
  notes name alike differ) and the lines that cite it, per document. A search box and a "Cited in"
  document picker (components/SourceFilter.tsx) hide what does not match and say how many links
  are left; without JavaScript the whole list shows. Each citing line is a numbered chip (a 24 px
  target), and a long host name breaks only after a dot.
- documents: /research/<slug> for path-to-1000x, corerope-design, quantization-numerics,
  moe-conditional-compute, attention-kv-cache, decoding-test-time, distillation-cost-trends,
  hardware-systems, results. Each has a TOC (ids from the same slugger as the headings), an evidence
  legend for notes, and a source link to the file. The renderer (site/lib/markdown.ts) sets a caret
  power as a superscript ("C^0.5095", "e^(-P_w/gamma_w)"), turns the design's "[Diagram: ...]" and
  "[Chart: ...]" specifications into a box linking to where the site draws them, and lets a table
  beside the contents list use the column's full width. Evidence pills drop the label's own
  brackets, and a label over 28 characters may wrap. Ranges, hyphenated names with numbers, flags,
  arrows and number-unit pairs never break ("55-82%", "gpt-oss-120b", "-noabc", "815 mm2"). A
  table whose first column is single short words (a rank, "Dropped") keeps it narrow; on a phone, cells over 60 characters
  hold a 13em column and the table scrolls sideways under its edge shade.

## How to reach it

- http://localhost:4317/research ; header link "Research"; the note links on /survey's lever families; every
  "From" link in a figure's provenance line that names a note.

## How to check it

Static: the build (generateStaticParams makes all nine).

Runtime:

```sh
for s in path-to-1000x corerope-design quantization-numerics moe-conditional-compute attention-kv-cache decoding-test-time distillation-cost-trends hardware-systems results; do
  printf '%s %s\n' $s "$(curl -s -o /dev/null -w '%{http_code}' localhost:4317/research/$s)"; done
curl -s localhost:4317/research/hardware-systems | grep -o '<h1[^>]*>[^<]*' | sed 's/<h1[^>]*>//'
curl -s localhost:4317/research | grep -o 'class="source-site"' | wc -l           # one per site (62)
curl -s localhost:4317/research/corerope-design | grep -o 'class="figure-spec"' | wc -l   # 2
curl -s localhost:4317/design | grep -c 'figure-spec'                                # 0: drawn there
curl -s localhost:4317/research/moe-conditional-compute | grep -o 'C<sup>0.5095</sup>' | head -1
cd site && npx vitest run test/sources.test.ts test/markdown.test.ts               # 5 + 6 pass
```

Proves it when: nine 200s; the h1 is "Inference Hardware and Serving Systems: Energy and Cost per
Token (state as of Nov 2026)"; one source-site per site, matching the "From N sites" stat; the
source tests pass. interact checks the filter: "arxiv" leaves only arxiv.org links, the picker
narrows to one document, and a search with no match offers "Show them all", which restores the
full count.

## Gotchas

- TOC links must match heading ids: both come from github-slugger in one pass. Two headings with the
  same text get -1 suffixes; a TOC built with a fresh slugger would point at the wrong one.
