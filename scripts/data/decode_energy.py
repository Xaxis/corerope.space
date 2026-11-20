"""Where the energy of a decode step goes, derived from the measured H100 coefficients.

  data/decode-energy.json

Three derivations, each the arithmetic the research itself does, with its inputs read from the
text (see _common.grab):
  b2024       the B2024 baseline's energy per token, split into weight reads, KV reads and
              arithmetic (01-report, "Two baselines and one metric"). The split between weights and
              KV uses the report's own rule: bytes per token = KV per sequence x HBM / (HBM - weights).
  batch       a dense 70B model's energy per token against batch size, for weights at 16, 8, 4 and
              1.58 bits (notes/hardware_systems.md, Q3 inferences): weight reads are shared by the
              batch, arithmetic is not.
  per_weight  energy spent per weight per token by an H100 reading it from HBM, by the H100 doing
              its arithmetic, by Taalas HC1, and the Corerope design's assumption.
"""

from __future__ import annotations

from _common import grab, num, write_json

REPORT = "research/01-report-path-to-1000x.md"
HW = "research/notes/hardware_systems.md"
DESIGN = "research/02-corerope-design.md"
MODEL = "experiments/cost-model/costmodel.py"

coef = grab(REPORT, r"\*\*([\d.]+) pJ per HBM bit and ([\d.]+) pJ per tensor-core FLOP\*\*")
pj_bit, pj_flop = (num(g) for g in coef["groups"])

w = grab(REPORT, r"BF16 weights occupy ~(\d+) GB")
hbm = grab(REPORT, r"\(16 GPUs, ([\d,]+) GB of HBM\)")
cfg = grab(REPORT, r"With (\d+) layers and (\d+) KV heads of dimension (\d+)")
ctx = grab(REPORT, r"~(\d+)K mean context")
stated = grab(REPORT, r"roughly \*\*([\d.]+) J of data movement plus ~([\d.]+) J of arithmetic per token\*\*")

weights_gb = num(w["groups"][0])
hbm_gb = num(hbm["groups"][0])
layers, kv_heads, head_dim = (int(g) for g in cfg["groups"])
context = int(ctx["groups"][0]) * 1024
kv_bytes_per_token = layers * kv_heads * head_dim * 2 * 2  # K and V, 2 bytes each in BF16
kv_seq_gb = kv_bytes_per_token * context / 1e9
batch = (hbm_gb - weights_gb) / kv_seq_gb  # sequences that fit beside the weights
weight_gb_per_token = weights_gb / batch
total_gb = kv_seq_gb * hbm_gb / (hbm_gb - weights_gb)
joules = lambda gb: gb * 1e9 * 8 * pj_bit * 1e-12  # noqa: E731
data_j = joules(total_gb)
stated_data_j, stated_math_j = (num(g) for g in stated["groups"])
if abs(data_j - stated_data_j) > 0.05:
    raise SystemExit(f"derived data movement {data_j:.2f} J does not round to the report's {stated_data_j} J")

b2024 = {
    "kv_mb_per_token": kv_bytes_per_token / 1e6,
    "kv_gb_per_sequence": kv_seq_gb,
    "sequences_beside_weights": batch,
    "gb_per_token": total_gb,
    "terms": [
        {"key": "weights", "label": "Weight reads (shared by the batch)", "joules": joules(weight_gb_per_token)},
        {"key": "kv", "label": "KV-cache reads (this sequence's own)", "joules": joules(kv_seq_gb)},
        {"key": "math", "label": "Arithmetic", "joules": stated_math_j},
    ],
}

# --- A dense 70B against batch size --------------------------------------------------------------
ex = grab(HW, r"weight reads (\d+)e9 x 8 bits x 11\.68 pJ is about ([\d.]+) J; math ([\d.]+)e11 FLOP x 0\.52 pJ is about ([\d.]+) J")
params = int(ex["groups"][0]) * 1e9
flops = num(ex["groups"][2]) * 1e11
math_j = flops * pj_flop * 1e-12
bits = [16, 8, 4, 1.58]
batches = sorted({round(10 ** (k / 16), 6) for k in range(0, 65)})  # 1 to 10,000
series = []
for b in bits:
    per_token = params * b * pj_bit * 1e-12
    series.append(
        {
            "bits": b,
            "label": f"{b:g}-bit weights",
            "crossover_batch": per_token / math_j,
            "points": [{"batch": n, "joules": per_token / n} for n in batches],
        }
    )
cross8 = next(s for s in series if s["bits"] == 8)["crossover_batch"]
cross4 = next(s for s in series if s["bits"] == 4)["crossover_batch"]
quoted = grab(HW, r"is about (\d+) \(for 8-bit weights\), about (\d+) for 4-bit")
for derived, said in zip((cross8, cross4), quoted["groups"], strict=True):
    if abs(derived - num(said)) / num(said) > 0.05:
        raise SystemExit(f"crossover {derived:.1f} does not match the notes' {said}")

# --- Energy per weight per token -----------------------------------------------------------------
taalas = grab(DESIGN, r"Taalas HC1 implies roughly (\d+) pJ per parameter per token for Llama-3\.1-8B at 4 bits \((\d+) W at ~([\d,]+) tok/s, derived\)")
watts, tps = num(taalas["groups"][1]), num(taalas["groups"][2])
assumption = grab(DESIGN, r"The model assumes ([\d.]+) pJ per weight-operation including wiring \(range ([\d.]+) to ([\d.]+)\)")
a_c, a_lo, a_hi = (num(g) for g in assumption["groups"])
per_weight = [
    {
        "key": "hbm8",
        "label": "H100: read one 8-bit weight from HBM",
        "pj": 8 * pj_bit,
        "kind": "measured coefficient",
        "source": {"file": REPORT, "line": coef["line"]},
    },
    {
        "key": "flop2",
        "label": "H100: the 2 FLOPs that weight feeds",
        "pj": 2 * pj_flop,
        "kind": "measured coefficient",
        "source": {"file": REPORT, "line": coef["line"]},
    },
    {
        "key": "taalas",
        "label": "Taalas HC1: hardwired 4-bit, per parameter",
        "pj": watts / tps / 8e9 * 1e12,
        "kind": "derived from vendor and EE Times figures",
        "source": {"file": DESIGN, "line": taalas["line"]},
    },
    {
        "key": "corerope",
        "label": "Corerope: wired ternary, shared sums (assumed)",
        "pj": a_c,
        "low": a_lo,
        "high": a_hi,
        "kind": "assumption to test (experiment 1)",
        "source": {"file": DESIGN, "line": assumption["line"]},
    },
]

write_json(
    "decode-energy",
    __file__,
    [REPORT, HW, DESIGN],
    "Energy of a generated token, derived from the H100 coefficients measured in arXiv 2607.26571 "
    f"({pj_bit} pJ per HBM bit, {pj_flop} pJ per tensor-core FLOP). Derived estimates, not measurements.",
    {
        "coefficients": {"pj_per_hbm_bit": pj_bit, "pj_per_flop": pj_flop, "source": {"file": REPORT, "line": coef["line"]}},
        "b2024": {**b2024, "source": {"file": REPORT, "line": stated["line"]}},
        "batch": {
            "model": f"Dense {int(params / 1e9)}B",
            "math_joules": math_j,
            "series": series,
            "source": {"file": HW, "line": ex["line"]},
        },
        "per_weight": per_weight,
    },
)
