"""Reads the survey's tables and a few numbers from its prose into JSON for the site's charts.

  data/levers.json          the lever map (gain, quality cost, overlaps, evidence grade) and the
                            multiplier budgets against B2024 (Table A) and B2026 (Table B)
  data/market-trend.json    the market-trend table, and how long each rate takes to reach 1000x
  data/roadmap.json         the design's seven next experiments, with the invention each one tests
  data/tokens-per-task.json output tokens per task on the Artificial Analysis index

Nothing is typed in by hand: every number is parsed from research/*.md. The few editorial choices
(which survey section a lever belongs to, which family a row of Table A or B joins, which invention
an experiment tests) are the dictionaries below, and the script fails if a table gains a row they
don't place.
"""

from __future__ import annotations

import math
import re

from _common import ROOT, find_table, grab, num, number, plain, write_json

REPORT = "research/01-report-path-to-1000x.md"
DESIGN = "research/02-corerope-design.md"
DECODING = "research/notes/decoding_test_time.md"
report = ROOT / REPORT
design = ROOT / DESIGN


def place(label: str, table: dict[str, str], what: str) -> str:
    for prefix, key in table.items():
        if plain(label).startswith(prefix):
            return key
    raise SystemExit(f"{what}: no place for row {plain(label)!r}; add it to the dictionary in {__file__}")


# --- The lever map -------------------------------------------------------------------------------
# Each lever of the map belongs to one subsection of "What November 2026 actually measures".
SECTIONS = {
    "low-bit": ("Low-bit numerics", "research/notes/quantization_numerics.md"),
    "moe": ("MoE is a", "research/notes/moe_conditional_compute.md"),
    "distillation": ("Distillation and capability density", "research/notes/distillation_cost_trends.md"),
    "attention": ("Attention and KV", "research/notes/attention_kv_cache.md"),
    "decoding": ("Decoding:", "research/notes/decoding_test_time.md"),
    "tokens": ("Tokens per task", "research/notes/decoding_test_time.md"),
    "serving": ("Serving software", "research/notes/hardware_systems.md"),
    "hardware": ("Hardware:", "research/notes/hardware_systems.md"),
}
LEVER_SECTION = {
    "FP4 QAT": "low-bit",
    "Ternary": "low-bit",
    "KV quantization": "low-bit",
    "2:4 weight sparsity": "low-bit",
    "MoE at": "moe",
    "Activation sparsity": "moe",
    "Distillation": "distillation",
    "Compressed / hybrid attention": "attention",
    "Speculation": "decoding",
    "Diffusion": "decoding",
    "Reasoning efficiency": "tokens",
    "Routing": "tokens",
    "Serving software": "serving",
    "GPU generation": "hardware",
    "SRAM": "hardware",
    "Hardwired": "hardware",
    "Analog": "hardware",
    "Photonics": "hardware",
}
lever_map = find_table(report, "Lever", "Lever map")
section_headings = [
    line.lstrip("#").strip()
    for line in report.read_text(encoding="utf8").splitlines()
    if line.startswith("### ")
]
sections = []
for key, (prefix, note) in SECTIONS.items():
    heading = next((h for h in section_headings if h.startswith(prefix)), None)
    if heading is None:
        raise SystemExit(f"{REPORT}: no ### heading starting with {prefix!r}")
    sections.append({"key": key, "heading": heading, "note": note})
levers = [
    {
        "lever": plain(r[0]),
        "section": place(r[0], LEVER_SECTION, "lever map"),
        "gain": r[1],
        "quality_cost": r[2],
        "overlaps": r[3],
        "evidence": r[4],
    }
    for r in lever_map["rows"]
]

# --- Tables A and B ------------------------------------------------------------------------------
FAMILIES = [
    {"key": "weight", "label": "Weights: bytes and active parameters"},
    {"key": "kv", "label": "KV cache and attention"},
    {"key": "model", "label": "Model side, per token"},
    {"key": "utilization", "label": "Utilization: serving and idle compute"},
    {"key": "hardware", "label": "Hardware"},
    {"key": "tokens", "label": "Tokens per task"},
    {"key": "total", "label": "All levers together"},
]
ROW_FAMILY_A = {
    "FP4 weights": "weight",
    "Sub-4-bit": "weight",
    "MoE at": "weight",
    "Capability density": "weight",
    "Activation sparsity": "weight",
    "Weight-group subtotal": "weight",
    "Attention architecture": "kv",
    "KV quantization": "kv",
    "KV-group subtotal": "kv",
    "Model-side per token": "model",
    "Serving software": "utilization",
    "Speculation": "utilization",
    "Diffusion": "utilization",
    "Utilization subtotal": "utilization",
    "GPU generation": "hardware",
    "Specialized silicon": "hardware",
    "Tokens per task": "tokens",
    "Naive product": "total",
    "Overlap-adjusted total": "total",
}
ROW_FAMILY_B = {
    "FP4 to": "model",
    "MoE from": "model",
    "Frontier distillation": "model",
    "Activation sparsity": "model",
    "KV from": "model",
    "Hybrid linear": "model",
    "Model-side per token": "model",
    "Serving maturity": "utilization",
    "GB300 to Rubin": "hardware",
    "Hardwired / SRAM": "hardware",
    "Reasoning-token": "tokens",
    "Routing cascade": "tokens",
    "Tokens-per-task subtotal": "tokens",
    "Naive product": "total",
    "Overlap-adjusted total": "total",
}


def budget(heading: str, families: dict[str, str]) -> dict:
    t = find_table(report, "Lever", heading)
    rows = []
    for r in t["rows"]:
        label = plain(r[0])
        kind = "lever"
        if r[0].startswith("**"):
            kind = "total" if ("total" in label.lower() and "subtotal" not in label.lower()) or label.startswith("Naive") else "subtotal"
        if label.startswith("Model-side per token"):
            kind = "subtotal"
        rows.append(
            {
                "label": label,
                "family": place(r[0], families, heading),
                "kind": kind,
                "naive": label.startswith("Naive"),
                "low": number(r[1]),
                "central": number(r[2]),
                "high": number(r[3]),
                "note": plain(r[4]),
            }
        )
    return {"heading": t["heading"], "line": t["line"], "rows": rows}


table_a = budget("Table A", ROW_FAMILY_A)
table_b = budget("Table B", ROW_FAMILY_B)

write_json(
    "levers",
    __file__,
    [REPORT],
    "The survey's lever map (best realized gain, quality cost, overlaps, evidence grade, as of "
    "November 2026) and its multiplier budgets: each lever's standalone multiplier (low, central, "
    "high), the overlap-adjusted subtotals, the naive product and the overlap-adjusted totals, "
    "against B2024 (Table A) and B2026 (Table B). The budgets are the report's estimates.",
    {
        "sections": sections,
        "levers": levers,
        "lever_map_line": lever_map["line"],
        "families": FAMILIES,
        "budgets": {"b2024": table_a, "b2026": table_b},
    },
)

# --- The market trend ----------------------------------------------------------------------------
trend = find_table(report, "Estimate", "market trend")
span = grab(REPORT, r"Mid-2024 to November 2026 is about ([\d.]+) years")
years_so_far = num(span["groups"][0])
epoch = grab(REPORT, r"~47% per quarter, \*\*~(\d+)x/yr\*\*")
a16z = grab(REPORT, r"\| ~(\d+)x/yr; 1000x in 3 years")
gund = grab(REPORT, r"GPQA Pareto [\d.]+x; open-weight ([\d.]+)x; \*\*~(\d+)x/yr algorithmic")
rates = [
    {"key": "epoch", "label": "Epoch, constant capability", "per_year": num(epoch["groups"][0]), "line": epoch["line"]},
    {"key": "a16z", "label": "a16z, LLMflation", "per_year": num(a16z["groups"][0]), "line": a16z["line"]},
    {"key": "open", "label": "Open-weight Pareto (Gundlach)", "per_year": num(gund["groups"][0]), "line": gund["line"]},
    {"key": "algo", "label": "Algorithmic only, hardware removed (Gundlach)", "per_year": num(gund["groups"][1]), "line": gund["line"]},
]
for r in rates:
    r["years_to_1000x"] = math.log(1000) / math.log(r["per_year"])
    r["by_nov_2026"] = r["per_year"] ** years_so_far
write_json(
    "market-trend",
    __file__,
    [REPORT],
    "How fast the price of a fixed capability falls, per the survey's market-trend table, and the "
    "arithmetic that follows: how much each rate has delivered since mid-2024 (rate to the power "
    f"{years_so_far} years) and how many years it takes to reach 1000x (log 1000 / log rate). Derived.",
    {
        "table": {"line": trend["line"], "header": trend["header"], "rows": trend["rows"]},
        "start": "mid-2024",
        "years_to_nov_2026": years_so_far,
        "rates": rates,
    },
)

# --- The roadmap ---------------------------------------------------------------------------------
TESTS = {
    "Invention 2's": ["wired-ternary"],
    "The Amdahl section's": ["two-tier-fleet"],
    "Invention 1": ["split-mind"],
    "Event-driven gain": ["wired-ternary"],
    "Invention 3": ["rom-core"],
    "Invention 5": ["tokens-per-task"],
    "The $3M NRE": ["wired-ternary"],
}
exp = find_table(design, "Order", "Experiments")
write_json(
    "roadmap",
    __file__,
    [DESIGN],
    "The seven experiments that would confirm or kill the Corerope design, cheapest decisive ones "
    "first, each with what it tests, its pass bar and what follows if it fails.",
    {
        "line": exp["line"],
        "experiments": [
            {
                "order": int(r[0]),
                "experiment": r[1],
                "tests": r[2],
                "pass_bar": r[3],
                "if_it_fails": r[4],
                "inventions": TESTS[next(p for p in TESTS if plain(r[2]).startswith(p))],
            }
            for r in exp["rows"]
        ],
    },
)

# --- Tokens per task -----------------------------------------------------------------------------
med = grab(DECODING, r"Median output tokens per task: (\d+)k \(v4\.3\) to \*\*(\d+)k \(v5\)\*\*")
per = grab(DECODING, r"Opus 5\.5 about (\d+)k \(1\.6x Opus 5\), Opus 5 about (\d+)k, Fable 5\.1 about (\d+)k, \*\*GPT-6 Astra about (\d+)k\*\*")
scores = grab(DECODING, r"Scores: Claude Opus 5\.5 \(max\) (\d+), GPT-6 Astra \(max\) (\d+)")
opus55, opus5, fable, astra = (num(g) * 1000 for g in per["groups"])
write_json(
    "tokens-per-task",
    __file__,
    [DECODING],
    "Output tokens per task on the Artificial Analysis Intelligence Index v5 (October 2026, max "
    "effort), and the index's median before and after the v5 revision.",
    {
        "models": [
            {"label": "Claude Opus 5.5 (max)", "tokens": opus55, "score": num(scores["groups"][0])},
            {"label": "Claude Fable 5.1", "tokens": fable, "score": None},
            {"label": "Claude Opus 5", "tokens": opus5, "score": None},
            {"label": "GPT-6 Astra (max)", "tokens": astra, "score": num(scores["groups"][1])},
        ],
        "median": {"v4_3": num(med["groups"][0]) * 1000, "v5": num(med["groups"][1]) * 1000},
        "lines": {"median": med["line"], "models": per["line"], "scores": scores["line"]},
    },
)

if not re.search(r"\d", str(levers)):
    raise SystemExit("lever map parsed empty")
