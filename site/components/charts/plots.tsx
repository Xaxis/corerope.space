"use client";

// The line charts. Each imports its own data file, so only that file ships to the browser.
import amdahl from "@data/amdahl.json";
import decode from "@data/decode-energy.json";
import spw from "@data/spw.json";
import { percent, times } from "@/lib/scale";
import { Legend, LineChart, type Series } from "./LineChart";

const shareTick = (v: number) => percent(v);
const xTick = (v: number) => `${v.toLocaleString("en-US")}x`;

/** Energy and dollar gain per task against the share of tasks that fall back to GPUs. */
export function AmdahlPlot() {
  const curve = amdahl.curve.filter((p) => p.share > 0);
  const series: Series[] = [
    {
      key: "energy",
      label: "Energy per task",
      color: "var(--accent-mark)",
      points: curve.map((p) => ({ x: p.share, y: p.energy_x })),
    },
    {
      key: "fabric",
      label: "Dollars per task, $3M NRE (via fabric)",
      color: "var(--blue)",
      points: curve.map((p) => ({ x: p.share, y: p.dollars_x_fabric })),
    },
    {
      key: "asic",
      label: "Dollars per task, $40M NRE (new chip)",
      color: "var(--blue)",
      dashed: true,
      points: curve.map((p) => ({ x: p.share, y: p.dollars_x_asic })),
    },
    {
      key: "cap",
      label: "Ceiling: 1 / share",
      color: "var(--neutral-mark)",
      dashed: true,
      points: curve
        .filter((p) => p.cap !== null && p.cap <= 10000)
        .map((p) => ({ x: p.share, y: p.cap as number })),
    },
  ];
  const at = (s: number) => amdahl.recorded.find((r) => r.share === s);
  const mark = (s: number, anchor: "start" | "end", dy: number) => {
    const r = at(s);
    return r
      ? [{ x: s, y: r.energy_x, label: times(r.energy_x), color: "var(--accent-mark)", anchor, dy }]
      : [];
  };
  return (
    <>
      <LineChart
        series={series}
        x={{
          type: "log",
          domain: [1e-5, 0.1],
          format: shareTick,
          label: "Share of tasks that fall back to GPUs (log scale)",
        }}
        y={{ type: "log", domain: [1, 10000], format: xTick }}
        height={320}
        hlines={[{ y: 1000, label: "1000x target" }]}
        vlines={[{ x: 0.0005, label: "Central case, 0.05%" }]}
        markers={[
          ...mark(0.0005, "end", 18),
          ...mark(0.001, "start", -10),
          ...mark(0.01, "start", -10),
          ...mark(0.05, "start", -10),
        ]}
        readout={(x) => `${percent(x)} of tasks on GPUs`}
        value={(y) => times(y)}
        ariaLabel="Line chart: the central case's gain per task falls as more tasks fall back to GPUs. 749x energy at 0.05%, 545x at 0.1%, 92x at 1%, 20x at 5%. The table below the chart lists the values."
      />
      <Legend
        items={[
          { label: "Energy per task", color: "var(--accent-mark)" },
          { label: "Dollars per task, $3M NRE (via fabric)", color: "var(--blue)" },
          { label: "Dollars per task, $40M NRE (new chip)", color: "var(--blue)", kind: "dash" },
          { label: "Ceiling: 1 / share", color: "var(--neutral-mark)", kind: "dash" },
        ]}
      />
    </>
  );
}

/** Shared partial-sum saving against group size, one line per layer shape. */
export function SpwPlot() {
  const colors = ["var(--ord-1)", "var(--ord-2)", "var(--ord-3)", "var(--ord-4)"];
  const series: Series[] = spw.layers.map((l, i) => ({
    key: `${l.inputs}x${l.outputs}`,
    label: `${l.inputs.toLocaleString("en-US")} x ${l.outputs.toLocaleString("en-US")} layer`,
    color: colors[i] ?? "var(--blue)",
    points: l.points.map((p) => ({ x: p.group, y: p.saving })),
  }));
  const big = spw.layers.at(-1);
  const best = big?.points.reduce((a, b) => (b.saving > a.saving ? b : a));
  const synth = spw.layers
    .find((l) => l.inputs === 48 && l.outputs === 256)
    ?.points.find((p) => p.group === 4);
  return (
    <>
      <LineChart
        series={series}
        x={{
          type: "linear",
          domain: [1, 8],
          ticks: [1, 2, 3, 4, 5, 6, 7, 8],
          format: (v) => String(v),
          label: "Inputs per shared group (g)",
        }}
        y={{ type: "linear", domain: [1, 3], ticks: [1, 1.5, 2, 2.5, 3], format: (v) => `${v}x` }}
        height={280}
        markers={[
          ...(best
            ? [
                {
                  x: best.group,
                  y: best.saving,
                  label: `${best.saving}x`,
                  color: "var(--ord-4)",
                  anchor: "middle" as const,
                  dy: -12,
                },
              ]
            : []),
          ...(synth
            ? [
                {
                  x: 4,
                  y: synth.saving,
                  label: `${synth.saving}x, the synthesized layer`,
                  color: "var(--ord-2)",
                  anchor: "start" as const,
                  dy: 18,
                },
              ]
            : []),
        ]}
        readout={(x) => `Groups of ${x} inputs`}
        value={(y) => `${y}x fewer adds`}
        ariaLabel="Line chart: shared partial sums save more adds on wider layers. Best is 2.85x for a 4096 by 4096 layer at groups of 6; 2.02x for the synthesized 48 by 256 layer at groups of 4. The table below lists every value."
      />
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </>
  );
}

/** Weight-read energy per token against batch, beside the arithmetic it feeds. */
export function BatchPlot() {
  const colors = ["var(--ord-4)", "var(--ord-3)", "var(--ord-2)", "var(--accent-mark)"];
  const series: Series[] = decode.batch.series.map((s, i) => ({
    key: String(s.bits),
    label: s.label,
    color: colors[i] ?? "var(--blue)",
    points: s.points.map((p) => ({ x: p.batch, y: p.joules })),
  }));
  const math = decode.batch.math_joules;
  return (
    <>
      <LineChart
        series={series}
        x={{
          type: "log",
          domain: [1, 10000],
          format: (v) => v.toLocaleString("en-US"),
          label: "Batch: sequences sharing each weight read (log scale)",
        }}
        y={{
          type: "log",
          domain: [1e-4, 100],
          format: (v) => `${v >= 1 ? v.toLocaleString("en-US") : Number(v.toPrecision(1))} J`,
        }}
        height={300}
        hlines={[{ y: math, label: `Arithmetic: ${Number(math.toPrecision(2))} J per token` }]}
        markers={decode.batch.series.map((s, i) => ({
          x: s.crossover_batch,
          y: math,
          label: `${Math.round(s.crossover_batch)}`,
          color: colors[i] ?? "var(--blue)",
          anchor: "middle" as const,
          dy: 20,
        }))}
        readout={(x) => `Batch ${Math.round(x).toLocaleString("en-US")}`}
        value={(y) => `${y >= 0.01 ? Number(y.toPrecision(3)) : y.toExponential(1)} J`}
        ariaLabel={`Line chart: per-token weight-read energy for a dense 70B model falls with batch size until it meets the arithmetic energy of ${Number(math.toPrecision(2))} J, at a batch of about 180 for 16-bit weights, 90 for 8-bit, 45 for 4-bit and 18 for 1.58-bit.`}
      />
      <Legend
        items={[
          ...series.map((s) => ({ label: s.label, color: s.color })),
          { label: "Arithmetic per token", color: "var(--ink-2)", kind: "dash" as const },
        ]}
      />
    </>
  );
}
