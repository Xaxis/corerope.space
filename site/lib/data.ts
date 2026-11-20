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
import type { Params } from "./costmodel";

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

/** The three cases of a scenario as parameter sets: 0 pessimistic, 1 central, 2 optimistic. */
export function presets(scenario: "fabric" | "as_written"): [Params, Params, Params] {
  const pick = (i: number) =>
    Object.fromEntries(
      costmodel.params.map((p) => [p.key, (p[scenario] as number[])[i]]),
    ) as Params;
  return [pick(0), pick(1), pick(2)];
}
