"""Reproduces experiments/RESULTS.md from the experiment scripts.

  python3 scripts/check_results.py

1. Runs experiments/cost-model/costmodel.py and requires its output to equal the "Cost model" block
   of RESULTS.md, character for character.
2. Requires data/spw.json (adds.py, re-run by `make data`) to match the recorded SPW ratios.
3. Requires data/gates.json (Yosys, re-run by `make synth` then `make data`) to match the recorded
   cell counts.

A part that was not re-run (no numpy, no Yosys logs) is reported as skipped, never as passed.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
results = (ROOT / "experiments/RESULTS.md").read_text(encoding="utf8")
failed = False


def block(heading: str) -> str:
    return results.split(heading, 1)[1].split("```")[1].strip("\n")


out = subprocess.run(
    [sys.executable, str(ROOT / "experiments/cost-model/costmodel.py")], check=True, capture_output=True, text=True
).stdout.strip("\n")
if out == block("## Cost model"):
    print("ok    cost model: costmodel.py prints exactly what RESULTS.md records")
else:
    failed = True
    print("FAIL  cost model: costmodel.py's output differs from RESULTS.md")

spw = json.loads((ROOT / "data/spw.json").read_text(encoding="utf8"))
if spw["matches_recorded"] is None:
    print("skip  SPW model: adds.py was not re-run (needs numpy: make venv, then make data)")
elif spw["matches_recorded"]:
    print("ok    SPW model: adds.py reproduces every recorded ratio")
else:
    failed = True
    print("FAIL  SPW model: adds.py's ratios differ from RESULTS.md")

gates = json.loads((ROOT / "data/gates.json").read_text(encoding="utf8"))
ran = [d for d in gates["designs"] if d["reproduced"] is not None]
if not ran:
    print("skip  gate counts: no Yosys logs (make venv, make synth, then make data)")
elif all(d["reproduced"] for d in ran) and len(ran) == len(gates["designs"]):
    print(f"ok    gate counts: Yosys {gates['yosys']} reproduces all {len(ran)} recorded cell counts")
else:
    failed = True
    bad = [d["file"] for d in gates["designs"] if not d["reproduced"]]
    print(f"FAIL  gate counts: {', '.join(bad)} differ from RESULTS.md or were not run")

sys.exit(1 if failed else 0)
