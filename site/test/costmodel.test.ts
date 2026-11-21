import golden from "@data/costmodel-golden.json";
import { describe, expect, it } from "vitest";
import { fromPosition, PARAMS, type Params, run, toPosition } from "@/lib/costmodel";
import { costmodel } from "@/lib/data";
import { presets } from "@/lib/presets";

/** The three cases of a scenario, run, as a tuple the compiler can see has three. */
function runCases(
  scenario: "fabric" | "as_written",
): [ReturnType<typeof run>, ReturnType<typeof run>, ReturnType<typeof run>] {
  const [low, central, high] = presets(scenario);
  return [run(low), run(central), run(high)];
}

type Vector = { params: Params; out: ReturnType<typeof run> };

function flat(o: object, prefix = ""): [string, number][] {
  return Object.entries(o).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? flat(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v as number]],
  );
}

describe("the TypeScript cost model", () => {
  it("reproduces every output of costmodel.py's run(), to the last bit", () => {
    const vectors = golden.vectors as Vector[];
    expect(vectors.length).toBeGreaterThan(200);
    let compared = 0;
    for (const v of vectors) {
      const want = new Map(flat(v.out));
      for (const [key, got] of flat(run(v.params))) {
        expect(Object.is(got, want.get(key)), `${key}: ${got} vs ${want.get(key)}`).toBe(true);
        compared++;
      }
      expect(flat(run(v.params)).length).toBe(want.size);
    }
    expect(compared).toBeGreaterThan(2000);
  });

  it("gives the design doc's headline multipliers in the fabric presets", () => {
    const [low, central, high] = runCases("fabric");
    const r = (x: number) => Math.round(x);
    expect([
      r(low.energy_x_per_task),
      r(central.energy_x_per_task),
      r(high.energy_x_per_task),
    ]).toEqual([15, 749, 46009]);
    expect([r(low.usd_x_per_task), r(central.usd_x_per_task), r(high.usd_x_per_task)]).toEqual([
      2, 263, 10533,
    ]);
    expect([
      r(low.energy_x_per_token),
      r(central.energy_x_per_token),
      r(high.energy_x_per_token),
    ]).toEqual([27, 801, 11502]);
    expect([r(low.usd_x_per_token), r(central.usd_x_per_token), r(high.usd_x_per_token)]).toEqual([
      3, 203, 2633,
    ]);
  });

  it("caps the gain per task near 1/f when a share f falls back to GPUs", () => {
    const [, central] = presets("fabric");
    const at = (gpu_share: number) => run({ ...central, gpu_share }).energy_x_per_task;
    expect(Math.round(at(0))).toBe(1196);
    expect(Math.round(at(0.01))).toBe(92);
    expect(Math.round(at(0.05))).toBe(20);
    expect(at(0.05)).toBeLessThan(1 / 0.05);
  });
});

describe("the calculator's sliders", () => {
  it("cover every parameter of the model, and only those", () => {
    expect(PARAMS.map((p) => p.key).sort()).toEqual(costmodel.params.map((p) => p.key).sort());
  });

  it("can reach every preset value, within the slider's resolution", () => {
    for (const preset of [...presets("fabric"), ...presets("as_written")]) {
      for (const spec of PARAMS) {
        const v = preset[spec.key];
        expect(v, spec.key).toBeGreaterThanOrEqual(spec.min);
        expect(v, spec.key).toBeLessThanOrEqual(spec.max);
        const back = fromPosition(spec, toPosition(spec, v));
        if (v === 0) expect(back).toBe(0);
        else
          expect(Math.abs(back - v) / v, `${spec.key} ${v} -> ${back}`).toBeLessThan(
            spec.scale === "linear" ? 0.02 : 0.03,
          );
      }
    }
  });
});
