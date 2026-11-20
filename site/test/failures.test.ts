// The experiments whose failure the design doc states as a cost-model input: each case reads its
// value from the doc's own words or the presets, and lands where the doc says it lands.
import { describe, expect, it } from "vitest";
import { presets, roadmap } from "@/lib/data";
import { failCase } from "@/lib/failures";

const byOrder = (n: number) => {
  const e = roadmap.experiments.find((x) => x.order === n);
  if (!e) throw new Error(`no experiment ${n}`);
  return e;
};

describe("experiment failure cases", () => {
  it("exist exactly for the experiments that name a cost-model input", () => {
    const withCase = roadmap.experiments.filter((e) => failCase(e) !== null).map((e) => e.order);
    expect(withCase).toEqual([1, 6, 7]);
  });

  it("experiment 1: 0.5 pJ per weight-operation, from the doc's 'Above 0.5 pJ'", () => {
    const c = failCase(byOrder(1));
    expect(c?.href).toBe("/cost-model?pJ_per_weight_op=0.5");
    expect(c && c.energy < c.central.energy / 2).toBe(true);
  });

  it("experiment 6: the pessimistic token ratio, which costs at most the ratio of token counts", () => {
    const c = failCase(byOrder(6));
    const [pess, central] = presets("fabric");
    expect(c?.href).toBe(`/cost-model?tok_ratio=${pess.tok_ratio}`);
    // The GPU fallback runs at baseline cost whatever the tokens, so the gain falls by less than
    // the ratio of token counts, but it does fall.
    const bound = (c?.central.energy ?? 0) * (central.tok_ratio / pess.tok_ratio);
    expect(c && c.energy < c.central.energy && c.energy > bound).toBe(true);
  });

  it("experiment 7: the new-chip scenario, where the doc says dollars fall back to ~90x", () => {
    const c = failCase(byOrder(7));
    expect(c?.href).toBe("/cost-model?scenario=as_written");
    expect(Math.round(c?.usd ?? 0)).toBeGreaterThanOrEqual(85);
    expect(Math.round(c?.usd ?? 0)).toBeLessThanOrEqual(95);
  });
});
