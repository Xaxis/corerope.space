# The research library

Every research file rendered whole, with a table of contents, evidence chips and every source link,
plus an index of every source cited across the files.

<!-- covers: page:/research, page:/research/[slug] -->

## Sub-features

- index: document cards for the survey, the design doc, the six notes and the recorded results.
- sources: "Every source cited": each link once, with the files and lines that cite it.
- documents: /research/<slug> for path-to-1000x, corerope-design, quantization-numerics,
  moe-conditional-compute, attention-kv-cache, decoding-test-time, distillation-cost-trends,
  hardware-systems, results. Each has a TOC (ids from the same slugger as the headings), an evidence
  legend for notes, and a source link to the file.

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
```

Proves it when: nine 200s; the h1 is "Inference Hardware and Serving Systems: Energy and Cost per
Token (state as of Nov 2026)".

## Gotchas

- TOC links must match heading ids: both come from github-slugger in one pass. Two headings with the
  same text get -1 suffixes; a TOC built with a fresh slugger would point at the wrong one.
