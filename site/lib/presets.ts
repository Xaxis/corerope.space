// The cost model's cases (data/costmodel.json, written by `make data` from costmodel.py), for the
// pages and for client components that label a chart or a control with one of their values. It
// reads only that one file, so a client component can import it without carrying the rest.
import costmodel from "@data/costmodel.json";
import type { Params } from "./costmodel";

export type Scenario = "fabric" | "as_written";

/** The three cases of a scenario as parameter sets: 0 pessimistic, 1 central, 2 optimistic. */
export function presets(scenario: Scenario): [Params, Params, Params] {
  const pick = (i: number) =>
    Object.fromEntries(
      costmodel.params.map((p) => [p.key, (p[scenario] as number[])[i]]),
    ) as Params;
  return [pick(0), pick(1), pick(2)];
}

/** The central case of each scenario. */
export const central: Record<Scenario, Params> = {
  fabric: presets("fabric")[1],
  as_written: presets("as_written")[1],
};

/** Dollars in millions, as the design writes an NRE: "$3M", "$40M". */
export function millions(usd: number): string {
  return `$${Number((usd / 1e6).toPrecision(3))}M`;
}
