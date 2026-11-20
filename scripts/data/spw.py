"""The shared partial-sum wiring (SPW) saving, from experiments/spw-model/adds.py.

  data/spw.json

Runs adds.py unchanged (it needs numpy: `make venv`) and reads what it prints: for each layer size,
the direct add count over the SPW add count at each group size g. The output is cached in
build/adds.out while adds.py is unchanged, since the 4096 x 4096 layer takes minutes. Every ratio is
checked against the run recorded in experiments/RESULTS.md. Without numpy it uses the recorded run
and says so in the data.
"""

from __future__ import annotations

import hashlib
import re
import subprocess
import sys

from _common import ROOT, write_json

ADDS = ROOT / "experiments/spw-model/adds.py"
RESULTS = ROOT / "experiments/RESULTS.md"
CACHE = ROOT / "build/adds.out"


def parse(text: str) -> list[dict]:
    rows = []
    for line in text.strip().splitlines():
        m = re.match(r"(\d+) (\d+)\s+(.*)", line.strip())
        if not m:
            continue
        pts = [{"group": int(g), "saving": float(x)} for g, x in re.findall(r"g(\d+):([\d.]+)x", m.group(3))]
        rows.append({"inputs": int(m.group(1)), "outputs": int(m.group(2)), "points": pts})
    return rows


block = RESULTS.read_text(encoding="utf8").split("## SPW add-count model", 1)[1].split("```")[1]
recorded = parse(block)

digest = hashlib.sha256(ADDS.read_bytes()).hexdigest()[:16]
out = None
if CACHE.exists() and CACHE.read_text(encoding="utf8").startswith(f"# adds.py {digest}\n"):
    out = CACHE.read_text(encoding="utf8").split("\n", 1)[1]
else:
    python = ROOT / ".venv/bin/python"
    exe = str(python) if python.exists() else sys.executable
    try:
        out = subprocess.run([exe, str(ADDS)], check=True, capture_output=True, text=True).stdout
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(f"# adds.py {digest}\n{out}", encoding="utf8")
    except subprocess.CalledProcessError as e:
        print(f"adds.py did not run ({e.stderr.strip().splitlines()[-1]}); using the recorded run")

rows = parse(out) if out else recorded
same = out is not None and [r["points"] for r in rows] == [r["points"] for r in recorded]
if out is not None and not same:
    print("warning: adds.py's output differs from the run recorded in RESULTS.md")

write_json(
    "spw",
    __file__,
    ["experiments/spw-model/adds.py", "experiments/RESULTS.md"],
    "How many times fewer adds a hardwired ternary layer needs when every signed combination of a "
    "group of g inputs is built once and shared by all output rows (shared partial-sum wiring), "
    "against adding each row's inputs directly. Random ternary weights, 40% zeros. An add-count "
    "model, not a synthesis.",
    {
        "source": "adds.py, re-run" if out else "experiments/RESULTS.md, as recorded",
        "matches_recorded": same if out else None,
        "layers": rows,
    },
)
