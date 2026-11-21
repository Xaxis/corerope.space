// The Corerope cost model: experiments/cost-model/costmodel.py's run(), ported line for line.
//
// Each expression keeps the Python's order of operations, so both produce the same IEEE doubles;
// test/costmodel.test.ts checks that against outputs the Python wrote (data/costmodel-golden.json)
// with Object.is, not a tolerance. Change costmodel.py, run `make data`, and the test says whether
// this port still agrees.

export type Params = {
  base_J_per_tok: number;
  base_usd_per_Mtok: number;
  core_active_B: number;
  pJ_per_weight_op: number;
  act_sparsity_gain: number;
  data_mJ_per_tok: number;
  overhead_mult: number;
  tok_ratio: number;
  deep_share: number;
  deep_cost_ratio: number;
  gpu_share: number;
  set_capex_usd: number;
  set_power_W: number;
  utilization: number;
  life_years: number;
  usd_per_kWh: number;
  pue: number;
  nre_usd: number;
  life_tokens: number;
  memtier_usd_per_Mtok: number;
};

export type ParamKey = keyof Params;

export type Result = {
  core_mJ: number;
  tok_mJ: number;
  tok_per_s_per_set: number;
  usd_per_Mtok: { capex: number; energy: number; nre: number; total: number };
  energy_x_per_token: number;
  usd_x_per_token: number;
  energy_x_per_task: number;
  usd_x_per_task: number;
};

/** costmodel.py's run(i), for one set of parameters. */
export function run(p: Params): Result {
  const core_mJ =
    ((p.core_active_B * 1e9 * p.pJ_per_weight_op * 1e-12) / p.act_sparsity_gain) * 1e3;
  const tok_mJ = (core_mJ + p.data_mJ_per_tok) * p.overhead_mult;
  // per-token cost of the tiered wired fleet (deep core priced as a multiple), then GPU fallback by share
  const wired_mix = 1 - p.deep_share + p.deep_share * p.deep_cost_ratio;
  const E_new_tok = tok_mJ * 1e-3 * wired_mix; // J per token, wired tiers
  const thr = p.set_power_W / (tok_mJ * 1e-3); // tok/s per set at full power
  const capex = (p.set_capex_usd / (p.life_years * 3.156e7 * thr * p.utilization)) * 1e6;
  const energy_usd = ((tok_mJ * 1e-3 * p.pue) / 3.6e6) * p.usd_per_kWh * 1e6;
  const nre = (p.nre_usd / p.life_tokens) * 1e6;
  const usd_new_tok = (capex + energy_usd + p.memtier_usd_per_Mtok) * wired_mix + nre;
  // per task: tokens ratio, then Amdahl blend with GPU fallback at baseline cost per task
  const E_task = (1 - p.gpu_share) * E_new_tok * p.tok_ratio + p.gpu_share * p.base_J_per_tok;
  const U_task = (1 - p.gpu_share) * usd_new_tok * p.tok_ratio + p.gpu_share * p.base_usd_per_Mtok;
  return {
    core_mJ,
    tok_mJ,
    tok_per_s_per_set: thr,
    usd_per_Mtok: { capex, energy: energy_usd, nre, total: usd_new_tok },
    energy_x_per_token: p.base_J_per_tok / E_new_tok,
    usd_x_per_token: p.base_usd_per_Mtok / usd_new_tok,
    energy_x_per_task: p.base_J_per_tok / E_task,
    usd_x_per_task: p.base_usd_per_Mtok / U_task,
  };
}

/** The Tier A / Tier B blend run() multiplies wired costs by. */
export function wiredMix(p: Params): number {
  return 1 - p.deep_share + p.deep_share * p.deep_cost_ratio;
}

/** Dollars per million tokens by term, as run() adds them (they sum to usd_per_Mtok.total). */
export function costTerms(p: Params, r: Result): { key: string; label: string; usd: number }[] {
  const mix = wiredMix(p);
  return [
    { key: "capital", label: "Capital", usd: r.usd_per_Mtok.capex * mix },
    { key: "nre", label: "Per-model NRE", usd: r.usd_per_Mtok.nre },
    { key: "memory", label: "Memory-tier storage", usd: p.memtier_usd_per_Mtok * mix },
    { key: "electricity", label: "Electricity", usd: r.usd_per_Mtok.energy * mix },
  ];
}

// ---- The calculator's controls ---------------------------------------------------------------

export type Scale = "linear" | "log" | "log0";

export type ParamSpec = {
  key: ParamKey;
  label: string;
  unit: string;
  group: string;
  min: number;
  max: number;
  scale: Scale;
  /** How to show a value. */
  format: (v: number) => string;
  /** Why it matters, in the design doc's terms. */
  help: string;
};

const pct = (v: number) => {
  const x = v * 100;
  return `${x === 0 ? "0" : x < 0.1 ? x.toPrecision(1) : x < 1 ? x.toFixed(2).replace(/0$/, "") : x.toPrecision(3).replace(/\.0+$/, "")}%`;
};
const sig = (v: number, n = 3) => {
  if (v === 0) return "0";
  const s = Number(v.toPrecision(n));
  return s.toLocaleString("en-US", { maximumFractionDigits: 6 });
};
const money = (v: number) => {
  if (v >= 1e9) return `$${sig(v / 1e9)}B`;
  if (v >= 1e6) return `$${sig(v / 1e6)}M`;
  if (v >= 1e3) return `$${sig(v / 1e3)}k`;
  return `$${sig(v)}`;
};
const power10 = (v: number) => {
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return Math.abs(m - 1) < 1e-9 ? `10^${e}` : `${sig(m, 2)} × 10^${e}`;
};

export const GROUPS = [
  "The baseline (B2026)",
  "The wired core",
  "Tokens and tiers",
  "Silicon and power",
  "Per-model cost",
] as const;

export const PARAMS: ParamSpec[] = [
  {
    key: "base_J_per_tok",
    label: "Baseline energy per token",
    unit: "J",
    group: GROUPS[0],
    min: 0.1,
    max: 20,
    scale: "log",
    format: (v) => `${sig(v)} J`,
    help: "A late-2026 frontier token on GB300 NVL72, derived from its price and SemiAnalysis's Rubin measurement.",
  },
  {
    key: "base_usd_per_Mtok",
    label: "Baseline price per million output tokens",
    unit: "$",
    group: GROUPS[0],
    min: 0.01,
    max: 10,
    scale: "log",
    format: (v) => `$${sig(v)}`,
    help: "DeepSeek-V4-Pro-class serving on GB300 NVL72, per million output tokens (InferenceX).",
  },
  {
    key: "core_active_B",
    label: "Tier A core size",
    unit: "B weights",
    group: GROUPS[1],
    min: 1,
    max: 100,
    scale: "log",
    format: (v) => `${sig(v)}B`,
    help: "The wired ternary reasoning core, in billions of weights. Every weight is a wire, so energy scales with this.",
  },
  {
    key: "pJ_per_weight_op",
    label: "Energy per weight-operation",
    unit: "pJ",
    group: GROUPS[1],
    min: 0.01,
    max: 3,
    scale: "log",
    format: (v) => `${sig(v)} pJ`,
    help: "Wired ternary with shared partial sums, including wiring: an assumption, not a measurement.",
  },
  {
    key: "act_sparsity_gain",
    label: "Event-driven sparsity gain",
    unit: "x",
    group: GROUPS[1],
    min: 1,
    max: 10,
    scale: "log",
    format: (v) => `${sig(v)}x`,
    help: "A zero activation holds its wires still, so nothing downstream switches.",
  },
  {
    key: "data_mJ_per_tok",
    label: "State and memory reads per token",
    unit: "mJ",
    group: GROUPS[1],
    min: 0.01,
    max: 5,
    scale: "log",
    format: (v) => `${sig(v)} mJ`,
    help: "Recurrent state, sparse global attention and memory-tier lookups.",
  },
  {
    key: "overhead_mult",
    label: "Overheads",
    unit: "x",
    group: GROUPS[1],
    min: 1,
    max: 3,
    scale: "linear",
    format: (v) => `${sig(v)}x`,
    help: "Leakage, I/O, control and sampling, as a multiple of the token's energy.",
  },
  {
    key: "tok_ratio",
    label: "Tokens per task vs baseline",
    unit: "x",
    group: GROUPS[2],
    min: 0.1,
    max: 4,
    scale: "log",
    format: (v) => (v > 1 ? `${sig(v)}x more` : v < 1 ? `${sig(1 / v)}x fewer` : "the same"),
    help: "Joule-priced RL, compiled skills and grounded latent reasoning, against a small core's habit of thinking longer.",
  },
  {
    key: "deep_share",
    label: "Tasks escalated to Tier B",
    unit: "%",
    group: GROUPS[2],
    min: 0,
    max: 0.5,
    scale: "linear",
    format: pct,
    help: "Tier B is the same design scaled up, a larger wired core sharing the memory tier.",
  },
  {
    key: "deep_cost_ratio",
    label: "Tier B cost relative to Tier A",
    unit: "x",
    group: GROUPS[2],
    min: 1,
    max: 20,
    scale: "log",
    format: (v) => `${sig(v)}x`,
    help: "Tier B's cost per token, as a multiple of Tier A's.",
  },
  {
    key: "gpu_share",
    label: "Tasks that fall back to GPUs",
    unit: "%",
    group: GROUPS[2],
    min: 0,
    max: 0.1,
    scale: "log0",
    format: pct,
    help: "The Amdahl trap: a share f at baseline cost caps the gain at 1/f.",
  },
  {
    key: "set_capex_usd",
    label: "Capital per core set",
    unit: "$",
    group: GROUPS[3],
    min: 1000,
    max: 200000,
    scale: "log",
    format: money,
    help: "Dies, package and HBM for per-user state.",
  },
  {
    key: "set_power_W",
    label: "Power per core set",
    unit: "W",
    group: GROUPS[3],
    min: 100,
    max: 10000,
    scale: "log",
    format: (v) => `${sig(v)} W`,
    help: "With the energy per token, this sets the set's throughput.",
  },
  {
    key: "utilization",
    label: "Utilization",
    unit: "%",
    group: GROUPS[3],
    min: 0.05,
    max: 1,
    scale: "linear",
    format: pct,
    help: "The share of its life a core set is serving.",
  },
  {
    key: "life_years",
    label: "Service life",
    unit: "years",
    group: GROUPS[3],
    min: 1,
    max: 10,
    scale: "linear",
    format: (v) => `${sig(v, 2)} years`,
    help: "Years over which a core set's capital is spread.",
  },
  {
    key: "usd_per_kWh",
    label: "Electricity price",
    unit: "$/kWh",
    group: GROUPS[3],
    min: 0.01,
    max: 0.5,
    scale: "log",
    format: (v) => `$${sig(v)}/kWh`,
    help: "Price of a kilowatt-hour at the facility.",
  },
  {
    key: "pue",
    label: "Power usage effectiveness",
    unit: "",
    group: GROUPS[3],
    min: 1,
    max: 2,
    scale: "linear",
    format: (v) => sig(v),
    help: "Facility energy over IT energy.",
  },
  {
    key: "nre_usd",
    label: "Per-model NRE",
    unit: "$",
    group: GROUPS[4],
    min: 1e5,
    max: 5e8,
    scale: "log",
    format: money,
    help: "Masks, design and verification per frozen-core generation: a full mask set for a new chip, or one via mask on the fabric.",
  },
  {
    key: "life_tokens",
    label: "Tokens served per core generation",
    unit: "tokens",
    group: GROUPS[4],
    min: 1e14,
    max: 1e19,
    scale: "log",
    format: power10,
    help: "Over which the NRE is spread. A core that stays frozen longer serves more.",
  },
  {
    key: "memtier_usd_per_Mtok",
    label: "Memory-tier storage per million tokens",
    unit: "$",
    group: GROUPS[4],
    min: 1e-6,
    max: 1e-2,
    scale: "log",
    format: (v) => `$${sig(v, 2)}`,
    help: "Every concurrent stream reads the same tables, so storage capital per token is small.",
  },
];

// Slider positions are 0..STEPS. "log0" puts 0 at position 0 and a log scale above it.
export const STEPS = 1000;
const LOG0_FLOOR = 1e-5;

export function toPosition(spec: ParamSpec, v: number): number {
  const { min, max, scale } = spec;
  let t: number;
  if (scale === "linear") t = (v - min) / (max - min);
  else if (scale === "log") t = Math.log(v / min) / Math.log(max / min);
  else
    t =
      v <= 0
        ? 0
        : 0.02 +
          (0.98 * Math.log(Math.max(v, LOG0_FLOOR) / LOG0_FLOOR)) / Math.log(max / LOG0_FLOOR);
  return Math.round(Math.min(1, Math.max(0, t)) * STEPS);
}

export function fromPosition(spec: ParamSpec, pos: number): number {
  const { min, max, scale } = spec;
  const t = pos / STEPS;
  let v: number;
  if (scale === "linear") v = min + t * (max - min);
  else if (scale === "log") v = min * (max / min) ** t;
  else v = t < 0.02 ? 0 : LOG0_FLOOR * (max / LOG0_FLOOR) ** ((t - 0.02) / 0.98);
  // Keep three significant figures, so a slider lands on readable values.
  return v === 0 ? 0 : Number(v.toPrecision(3));
}
