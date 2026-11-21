// The chart data, written by scripts/data/*.py (`make data`) into data/*.json at the repository
// root. Imported at build time; the site never computes a research number itself, except the cost
// model's, which it runs with lib/costmodel.ts (tested against the Python).
import amdahl from "@data/amdahl.json";
import costBreakdown from "@data/cost-breakdown.json";
import costmodel from "@data/costmodel.json";
import decodeEnergy from "@data/decode-energy.json";
import gates from "@data/gates.json";
import levers from "@data/levers.json";
import marketTrend from "@data/market-trend.json";
import multipliers from "@data/multipliers.json";
import roadmap from "@data/roadmap.json";
import spw from "@data/spw.json";
import tokensPerTask from "@data/tokens-per-task.json";

export {
  amdahl,
  costBreakdown,
  costmodel,
  decodeEnergy,
  gates,
  levers,
  marketTrend,
  multipliers,
  roadmap,
  spw,
  tokensPerTask,
};

export type Provenance = { script: string; sources: string[]; about: string };

/** The survey's overlap-adjusted total for a baseline, per solved task, central case. */
export function leverTotal(b: "b2024" | "b2026", what: "cost" | "energy"): number {
  const r = levers.budgets[b].rows.find(
    (x) => x.kind === "total" && !x.naive && x.label.includes(what),
  );
  if (!r || r.central === null) throw new Error(`data: levers.json has no ${what} total for ${b}`);
  return r.central;
}
