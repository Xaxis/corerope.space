"""Gate counts of the wired-layer designs, from the Yosys logs scripts/synth.sh writes.

  data/gates.json

Reads build/synth/log_*.v.txt (the cell count Yosys reports after `synth -flatten -noabc`) for each
of the 15 designs in experiments/RESULTS.md, divides by the layer's weights (N x M), and checks
every count against the one recorded in RESULTS.md. Without the logs (no `make synth` yet) it uses
the recorded counts and says so in the data.
"""

from __future__ import annotations

import re

from _common import ROOT, find_table, plain, write_json

RESULTS = ROOT / "experiments/RESULTS.md"
DESIGN = ROOT / "research/02-corerope-design.md"
SYNTH = ROOT / "build/synth"

block = RESULTS.read_text(encoding="utf8").split("## Wired-layer gate counts", 1)[1].split("```")[1]
recorded = {m.group(1): int(m.group(2)) for m in re.finditer(r"(\S+\.v)\s+cells=(\d+)", block)}
if len(recorded) != 15:
    raise SystemExit(f"expected 15 recorded designs in RESULTS.md, found {len(recorded)}")

# The six designs of the design doc's gate table, in its row order.
FEATURED = [
    "mac_1x1_a8.v",
    "int4_32x32_a8.v",
    "ternary_32x32_a8.v",
    "ternary_32x32_a4.v",
    "direct_48x256_a8_g1.v",
    "spw_48x256_a8_g4.v",
]
doc_table = find_table(DESIGN, "Design (8-bit activations unless noted)")
if len(doc_table["rows"]) != len(FEATURED):
    raise SystemExit("the design doc's gate table changed size; update FEATURED")

KIND = {
    "mac": "Stored-weight 4-bit MAC, per operation",
    "int4": "Wired 4-bit weights",
    "ternary": "Wired ternary",
    "direct": "Wired ternary, direct",
    "spw": "Wired ternary, shared partial sums",
}

version = None
designs = []
for name, rec in recorded.items():
    m = re.fullmatch(r"(\w+?)_(\d+)x(\d+)_a(\d+)(?:_g(\d+))?\.v", name)
    if not m:
        raise SystemExit(f"cannot read the design's shape from {name}")
    kind, n, mm, abits, g = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
    log = SYNTH / f"log_{name}.txt"
    cells = None
    if log.exists():
        text = log.read_text(encoding="utf8", errors="replace")
        counts = re.findall(r"^\s+(\d+)\s+cells$", text, re.M)
        cells = int(counts[-1]) if counts else None
        v = re.search(r"Yosys (\d+\.\d+)", text)
        version = version or (v.group(1) if v else None)
    weights = n * mm
    used = cells if cells is not None else rec
    designs.append(
        {
            "file": name,
            "kind": kind,
            "label": KIND[kind],
            "inputs": n,
            "outputs": mm,
            "activation_bits": abits,
            "group": int(g) if g else None,
            "weights": weights,
            "cells": used,
            "recorded_cells": rec,
            "reproduced": None if cells is None else cells == rec,
            "gates_per_weight": used / weights,
            "featured": FEATURED.index(name) if name in FEATURED else None,
            "doc_label": plain(doc_table["rows"][FEATURED.index(name)][0]) if name in FEATURED else None,
        }
    )

for d in designs:
    if d["featured"] is None:
        continue
    said = plain(doc_table["rows"][d["featured"]][1]).split(",")[0]
    if f"{d['gates_per_weight']:.1f}" != f"{float(said):.1f}":
        raise SystemExit(f"{d['file']}: {d['gates_per_weight']:.2f} gates per weight, the design doc says {said}")

ran = [d for d in designs if d["reproduced"] is not None]
if any(d["reproduced"] is False for d in ran):
    bad = [f"{d['file']} {d['cells']} vs {d['recorded_cells']}" for d in ran if not d["reproduced"]]
    print("warning: re-synthesis differs from RESULTS.md: " + "; ".join(bad))

write_json(
    "gates",
    __file__,
    ["experiments/RESULTS.md", "experiments/wired-layers/gen.py", "experiments/wired-layers/gen2.py",
     "experiments/wired-layers/run.sh", "experiments/wired-layers/run2.sh", "scripts/synth.sh"],
    "Generic gates per weight for hardwired matrix-vector layers with random weights, synthesized "
    "with Yosys (synth -flatten -noabc). A proxy for switching energy: it leaves out wire "
    "capacitance, and ABC logic optimization did not run, so absolute counts are high but the "
    "ratios are like for like.",
    {
        "yosys": version or "0.71 (recorded)",
        "source": "build/synth logs, re-run" if len(ran) == len(designs) else "experiments/RESULTS.md, as recorded",
        "reproduced": f"{sum(1 for d in ran if d['reproduced'])} of {len(designs)}" if ran else None,
        "designs": designs,
    },
)
