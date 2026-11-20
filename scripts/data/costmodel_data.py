"""Runs the cost model (experiments/cost-model/costmodel.py) and writes what the site charts from it.

  data/costmodel.json         the assumption table, both scenarios the script prints, presets
  data/multipliers.json       the headline range plot: energy and dollars, per task and per token
  data/amdahl.json            the gain per task against the share of tasks that fall back to GPUs
  data/cost-breakdown.json    what a million tokens costs, by term, in each case
  data/costmodel-golden.json  inputs and outputs that the site's TypeScript port is tested against

The numbers come from the script's own S table and run(), loaded from its source (see
_common.load_costmodel), so editing costmodel.py and re-running `make data` updates every chart.
"""

from __future__ import annotations

import copy
import math
import random

from _common import costmodel_comments, load_costmodel, write_json

SRC = "experiments/cost-model/costmodel.py"
NAMES = ["low", "central", "high"]
LABELS = {"low": "Pessimistic", "central": "Central", "high": "Optimistic"}

ns = load_costmodel()
S0 = copy.deepcopy(ns["S"])  # the table exactly as written
run = ns["run"]

# The second scenario costmodel.py prints: the via-programmed fabric (per-model NRE ~$3M central)
# with a 0.05% GPU fallback. These are the lines it assigns before printing that block.
FABRIC: dict[str, tuple] = {"nre_usd": (20e6, 3e6, 1e6), "gpu_share": (0.01, 0.0005, 0.0)}


def with_params(overrides: dict[str, tuple]) -> None:
    ns["S"].clear()
    ns["S"].update(copy.deepcopy(S0))
    ns["S"].update(overrides)


def results(overrides: dict[str, tuple]) -> dict[str, dict]:
    with_params(overrides)
    return {name: run(i) for i, name in enumerate(NAMES)}


as_written = results({})
fabric = results(FABRIC)

comments = costmodel_comments()
params = [
    {
        "key": k,
        "comment": comments.get(k, ""),
        "as_written": list(v),
        "fabric": list(FABRIC.get(k, v)),
    }
    for k, v in S0.items()
]

write_json(
    "costmodel",
    __file__,
    [SRC],
    "The cost model's assumptions (S) and its results in the two scenarios costmodel.py prints: as "
    "written (per-model NRE $150M/$40M/$10M, GPU fallback 1%/0.1%/0%) and with the via-programmed "
    "fabric (NRE $20M/$3M/$1M, GPU fallback 1%/0.05%/0%). The site's presets are the fabric scenario.",
    {
        "cases": [{"key": n, "label": LABELS[n]} for n in NAMES],
        "params": params,
        "scenarios": {"as_written": as_written, "fabric": fabric},
    },
)

# --- The headline range plot ---------------------------------------------------------------------
rows = [
    ("energy_task", "Energy per task", "energy_x_per_task", "task"),
    ("dollars_task", "Dollars per task", "usd_x_per_task", "task"),
    ("energy_token", "Energy per token", "energy_x_per_token", "token"),
    ("dollars_token", "Dollars per token", "usd_x_per_token", "token"),
]
write_json(
    "multipliers",
    __file__,
    [SRC, "research/02-corerope-design.md"],
    "How many times less energy and money the Corerope stack spends than the B2026 baseline "
    "(DeepSeek-V4-Pro-class on GB300 NVL72), per solved task and per token, in the pessimistic, "
    "central and optimistic cases of the via-programmed fabric scenario.",
    {
        "target": 1000,
        "rows": [
            {
                "key": key,
                "label": label,
                "per": per,
                "low": fabric["low"][field],
                "central": fabric["central"][field],
                "high": fabric["high"][field],
            }
            for key, label, field, per in rows
        ],
    },
)

# --- The Amdahl curve ----------------------------------------------------------------------------
# costmodel.py prints these five fallback shares with the central case otherwise, and per-model NRE
# as first written ($40M central). Energy does not depend on NRE; dollars do, so the curve carries
# dollars under both NRE assumptions.
RECORDED = [0.0, 0.0005, 0.001, 0.01, 0.05]
shares = sorted(set(RECORDED + [round(10 ** (e / 20), 10) for e in range(-120, -19)]))


def central_with(share: float, nre: tuple) -> dict:
    with_params({"nre_usd": nre, "gpu_share": (S0["gpu_share"][0], share, S0["gpu_share"][2])})
    return run(1)


curve = []
for s in shares:
    fab = central_with(s, FABRIC["nre_usd"])
    asic = central_with(s, S0["nre_usd"])
    curve.append(
        {
            "share": s,
            "energy_x": fab["energy_x_per_task"],
            "dollars_x_fabric": fab["usd_x_per_task"],
            "dollars_x_asic": asic["usd_x_per_task"],
            "cap": (1 / s) if s > 0 else None,
        }
    )
recorded = []
for s in RECORDED:
    r = central_with(s, S0["nre_usd"])
    recorded.append({"share": s, "energy_x": r["energy_x_per_task"], "dollars_x": r["usd_x_per_task"]})

write_json(
    "amdahl",
    __file__,
    [SRC, "research/02-corerope-design.md"],
    "The central case's gain per solved task as the share of tasks that still fall back to "
    "B2026-class GPUs grows. 1/share is the ceiling: no gain on the rest can beat it. Dollars are "
    "given with the via-programmed fabric's NRE ($3M) and with the stored-weight ASIC's ($40M).",
    {"curve": curve, "recorded": recorded},
)

# --- Cost of a million tokens, by term -----------------------------------------------------------
# usd_new_tok = (capex + energy + memtier) * wired_mix + nre, exactly as run() adds them.
breakdown = {}
with_params(FABRIC)
for i, name in enumerate(NAMES):
    p = {k: v[i] for k, v in ns["S"].items()}
    r = run(i)
    mix = (1 - p["deep_share"]) + p["deep_share"] * p["deep_cost_ratio"]
    u = r["usd_per_Mtok"]
    terms = [
        ("capital", "Capital (core sets over their life)", u["capex"] * mix),
        ("nre", "Per-model NRE (masks, design, verification)", u["nre"]),
        ("memory", "Memory-tier storage", p["memtier_usd_per_Mtok"] * mix),
        ("electricity", "Electricity", u["energy"] * mix),
    ]
    total = sum(t[2] for t in terms)
    if not math.isclose(total, u["total"], rel_tol=1e-12):
        raise SystemExit(f"breakdown does not add up for {name}: {total} vs {u['total']}")
    breakdown[name] = {
        "total_usd_per_Mtok": u["total"],
        "wired_mix": mix,
        "terms": [{"key": k, "label": lab, "usd": v, "share": v / total} for k, lab, v in terms],
    }
write_json(
    "cost-breakdown",
    __file__,
    [SRC],
    "Dollars per million tokens on the wired fleet, split into the terms run() adds: capital, "
    "electricity and memory-tier storage (each times the Tier A/Tier B mix), plus per-model NRE. "
    "Via-programmed fabric scenario.",
    {"cases": breakdown},
)

# --- Golden vectors for the TypeScript port ------------------------------------------------------
rng = random.Random(20261119)


def sample(key: str) -> float:
    lo = min(S0[key] + FABRIC.get(key, S0[key]))
    hi = max(S0[key] + FABRIC.get(key, S0[key]))
    if key == "gpu_share" and rng.random() < 0.15:
        return 0.0
    if lo > 0 and hi / lo > 4:
        return math.exp(rng.uniform(math.log(lo / 2), math.log(hi * 2)))
    return rng.uniform(lo * 0.5, hi * 1.5) if lo != hi else lo * rng.uniform(0.5, 1.5)


vectors = []
for case in range(3):
    with_params(FABRIC)
    vectors.append({"params": {k: v[case] for k, v in ns["S"].items()}, "out": run(case)})
for _ in range(250):
    p = {k: sample(k) for k in S0}
    p["deep_share"] = min(p["deep_share"], 0.5)
    p["gpu_share"] = min(p["gpu_share"], 0.5)
    p["utilization"] = min(p["utilization"], 1.0)
    with_params({k: (v, v, v) for k, v in p.items()})
    vectors.append({"params": p, "out": run(0)})

write_json(
    "costmodel-golden",
    __file__,
    [SRC],
    "Inputs and outputs of run() for the three fabric cases and 250 random parameter sets. The "
    "site's TypeScript port of the model (site/lib/costmodel.ts) must reproduce every output.",
    {"vectors": vectors},
)
