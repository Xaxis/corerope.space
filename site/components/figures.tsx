// Every figure on the site: a chart in its frame, with its numbers as a table, the data file and
// script that produced them, and the research lines they come from.
import { Fragment } from "react";
import {
  aroundPlaceholder,
  DESIGN,
  RESULTS,
  readRepo,
  SURVEY,
  section,
  sourceOf,
} from "@/lib/content";
import {
  amdahl,
  costBreakdown,
  decodeEnergy,
  gates,
  levers,
  marketTrend,
  multipliers,
  spw,
  tokensPerTask,
} from "@/lib/data";
import { wireExperiment } from "@/lib/inventions";
import { central, millions } from "@/lib/presets";
import { fmt, percent, tickLabel, times } from "@/lib/scale";
import { TARGET } from "@/lib/site";
import { BarRows, StackBar } from "./charts/Bars";
import { DataTable, Figure } from "./charts/Figure";
import { AmdahlPlot, BatchPlot, SpwPlot } from "./charts/plots";
import { type RangeRow, RangeRows } from "./charts/RangeRows";
import { Tabs } from "./Tabs";

/** A value the research or a data file states, found by a pattern; the build fails if it drifts. */
function stated(text: string, re: RegExp, what: string): string {
  const m = re.exec(text);
  if (!m?.[1]) throw new Error(`figures: the source no longer says ${what}`);
  return m[1];
}

const from = (file: string, prefix: string, label?: string) => {
  const s = section(file, prefix);
  return { ...sourceOf(s), label: label ?? s.title };
};

const row = (key: string) => {
  const r = multipliers.rows.find((x) => x.key === key);
  if (!r) throw new Error(`figures: no multiplier row ${key}`);
  return r;
};

/* 1. The headline: multipliers per task and per token -------------------------------------- */

export function MultiplierFigure() {
  const et = row("energy_task");
  const dt = row("dollars_task");
  const rows: RangeRow[] = multipliers.rows.map((r) => ({
    key: r.key,
    name: `${r.label}, ${r.per === "task" ? "per solved task" : "per token"}`,
    label: r.label,
    low: r.low,
    central: r.central,
    high: r.high,
    tone: r.per === "task" ? "accent" : "neutral",
    group: r.per === "task" ? "Per solved task" : "Per token",
    emphasis: r.per === "task",
    detail: "Pessimistic to optimistic case; the dot is the central case",
  }));
  return (
    <Figure
      title={`Central case: ${times(et.central)} less energy and ${times(dt.central)} lower cost per task`}
      subtitle="How many times cheaper the Corerope stack would be than a late-2026 frontier deployment (B2026), from its cost model. The dot is the central case; the whisker runs from the pessimistic to the optimistic case."
      data={{ file: "data/multipliers.json", provenance: multipliers.provenance }}
      sources={[from(DESIGN, "Multiplier budget")]}
      table={
        <DataTable
          caption="Multipliers by case"
          head={["Measure", "Pessimistic", "Central", "Optimistic"]}
          rows={multipliers.rows.map((r) => [
            `${r.label} (per ${r.per})`,
            times(r.low),
            times(r.central),
            times(r.high),
          ])}
        />
      }
      note="A model of a design, not a measurement: every input is an assumption that the experiments on this site would test."
    >
      <RangeRows
        rows={rows}
        domain={[1, 100000]}
        target={{ value: multipliers.target, label: "1000x target" }}
        axisLabel="Times cheaper than B2026 (log scale)"
      />
    </Figure>
  );
}

/* 3. The Amdahl trap ------------------------------------------------------------------------ */

export function AmdahlFigure() {
  const zero = amdahl.curve.find((p) => p.share === 0);
  const fabricAt = (s: number) =>
    amdahl.curve.find((p) => Math.abs(p.share - s) < 1e-12)?.dollars_x_fabric;
  return (
    <Figure
      title="Every task that falls back to GPUs pulls the gain toward 1/share"
      subtitle="The cost model's central case, run at each GPU fallback share. A share f at baseline cost caps the gain per task at 1/f, however cheap the rest becomes."
      data={{ file: "data/amdahl.json", provenance: amdahl.provenance }}
      sources={[from(DESIGN, "The Amdahl trap")]}
      note={
        zero && (
          <>
            With no fallback at all: {times(zero.energy_x)} less energy,{" "}
            {times(zero.dollars_x_fabric)} lower cost with a {millions(central.fabric.nre_usd)}{" "}
            per-model NRE, and {times(zero.dollars_x_asic)} with{" "}
            {millions(central.as_written.nre_usd)}.
          </>
        )
      }
      table={
        <DataTable
          caption="Gain per task by GPU fallback share"
          head={[
            "Share on GPUs",
            "Energy per task",
            `Dollars, ${millions(central.fabric.nre_usd)} NRE`,
            `Dollars, ${millions(central.as_written.nre_usd)} NRE (as recorded)`,
          ]}
          rows={amdahl.recorded.map((r) => [
            percent(r.share),
            times(r.energy_x),
            times(fabricAt(r.share) ?? Number.NaN),
            times(r.dollars_x),
          ])}
        />
      }
    >
      <AmdahlPlot />
    </Figure>
  );
}

/* 2. The fleet ------------------------------------------------------------------------------ */

/** The design's own drawing of the fleet, read from its [Diagram: ...] placeholder. */
function fleetSpec() {
  const spec = aroundPlaceholder(section(DESIGN, "The Amdahl trap"))?.placeholder ?? "";
  const grab = (re: RegExp, what: string) => stated(spec, re, `in its fleet diagram, ${what}`);
  return {
    a: grab(/Tier A: (\d+B) wired core/, "Tier A: <n>B wired core"),
    aShare: grab(/Tier A: \d+B wired core \((~\d+%) of tasks/, "Tier A's share of tasks"),
    aEnergy: grab(/of tasks, (~[\d.]+ mJ) per token/, "Tier A's energy per token"),
    b: grab(/Tier B core \((~\d+B) wired/, "Tier B core (~<n>B wired"),
    bShare: grab(/Tier B core \(~\d+B wired, (~\d+%)\)/, "Tier B's share of tasks"),
    gpu: grab(/GPU fallback \((at most [\d.]+%) of tasks/, "GPU fallback (at most <n>% of tasks"),
    nand: grab(/NAND: (\d+-\d+T) params/, "NAND: <a>-<b>T params").replace("-", " to "),
    dram: grab(/DRAM: (~[\d.]+T) params/, "DRAM: ~<n>T params"),
  };
}

export function FleetDiagram() {
  const at = (s: number) => amdahl.recorded.find((r) => r.share === s)?.energy_x ?? Number.NaN;
  const f = fleetSpec();
  const costB = `~${central.fabric.deep_cost_ratio}x Tier A's cost per token`;
  return (
    <Figure
      data={{ file: "data/amdahl.json", provenance: amdahl.provenance }}
      title={`Every task stays on wired silicon: a 1% GPU fallback caps the gain at ${times(at(0.01))}`}
      subtitle="The two-tier fleet. A router sends each task to the small wired core; only what it cannot do climbs to a larger wired core, and almost nothing reaches GPUs."
      sources={[
        from(DESIGN, "The Amdahl trap"),
        from(DESIGN, "Invention 4", "Lookup-in-storage memory tier"),
      ]}
      note={`Cost model, central case: a GPU fallback share of 0% gives ${times(at(0))} less energy per task; 0.1% gives ${times(at(0.001))}, 1% gives ${times(at(0.01))} and 5% gives ${times(at(0.05))}.`}
    >
      <div
        className="fleet"
        role="img"
        aria-label={`Diagram. A task arrives from a user or agent and goes to a router and verifier running on the Tier A core. Tier A, a ${f.a} wired core, handles ${f.aShare} of tasks at ${f.aEnergy} per token, reading a memory tier of NAND (${f.nand} parameters) and DRAM (${f.dram} parameters) through lookups. It escalates ${f.bShare} of tasks to Tier B, a ${f.b} wired core at ${costB}. As a last resort, ${f.gpu} of tasks fall back to GPUs.`}
      >
        <div className="fleet-flow">
          <div className="fnode">
            <span className="fkick">Input</span>
            <b>Task arrives</b>
            <span>from a user or an agent</span>
          </div>
          <div className="farrow" aria-hidden="true" />
          <div className="fnode">
            <span className="fkick">Routing</span>
            <b>Router + verifier</b>
            <span>runs on the Tier A core</span>
          </div>
          <div className="farrow" aria-hidden="true" />
          <div className="fnode fnode-a">
            <span className="fkick">Tier A</span>
            <b>{f.a} wired core</b>
            <span>{f.aShare} of tasks</span>
            <span>{f.aEnergy} per token</span>
          </div>
          <div className="farrow farrow-esc" aria-hidden="true">
            <span>escalate</span>
          </div>
          <div className="fnode fnode-b">
            <span className="fkick">Tier B</span>
            <b>{f.b} wired core</b>
            <span>{f.bShare} of tasks</span>
            <span>{costB}</span>
          </div>
          <div className="farrow farrow-last" aria-hidden="true">
            <span>last resort</span>
          </div>
          <div className="fnode fnode-gpu">
            <span className="fkick">Fallback</span>
            <b>GPUs</b>
            <span>{f.gpu} of tasks</span>
          </div>
        </div>
        <div className="fleet-mem">
          <div className="flookup" aria-hidden="true">
            <span>lookups</span>
          </div>
          <div className="fnode fnode-mem">
            <span className="fkick">Memory tier, shared by every stream</span>
            <div className="fmem-grid">
              <span>
                <b>NAND</b> {f.nand} parameters
              </span>
              <span>
                <b>DRAM</b> {f.dram} parameters
              </span>
              <span>
                <b>Cartridges</b> and snapshots
              </span>
            </div>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/* 4. Gate counts ---------------------------------------------------------------------------- */

const KIND_COLOR: Record<string, string> = {
  mac: "var(--ink-2)",
  int4: "var(--blue)",
  ternary: "var(--accent-mark)",
  direct: "var(--accent-mark)",
  spw: "var(--accent-mark)",
};

export function GatesFigure() {
  const featured = gates.designs
    .filter((d) => d.featured !== null)
    .sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0));
  const layer = (d: (typeof gates.designs)[number]) => `${d.inputs} x ${d.outputs}`;
  // Like for like, as the design compares them: ternary and 4-bit on the same layer and activations.
  const int4 = featured.find((d) => d.kind === "int4");
  const ternary = featured.find(
    (d) =>
      d.kind === "ternary" &&
      d.inputs === int4?.inputs &&
      d.outputs === int4?.outputs &&
      d.activation_bits === int4?.activation_bits,
  );
  const mac = featured.find((d) => d.kind === "mac");
  if (!int4 || !ternary || !mac) throw new Error("figures: gates.json lacks a like-for-like pair");
  const per = (d: (typeof gates.designs)[number]) => Math.round(d.gates_per_weight);
  return (
    <Figure
      title={`Wired ternary needs about ${per(ternary)} gates per weight; wired 4-bit about ${per(int4)}, a stored-weight MAC ${per(mac)}`}
      subtitle="Generic gates per weight after synthesis, for hardwired matrix-vector layers with random weights (8-bit activations unless noted). Fewer gates means less switching."
      data={{ file: "data/gates.json", provenance: gates.provenance }}
      sources={[
        from(DESIGN, "Invention 2"),
        from(RESULTS, "Wired-layer gate counts", "RESULTS.md, gate counts"),
      ]}
      note={`A proxy for switching energy, not a measurement of it: wire capacitance is left out, and Yosys ran without ABC optimization, so absolute counts are high but the ratios are like for like. Re-run for this site with Yosys ${gates.yosys}: ${gates.reproduced} cell counts match the recorded ones.`}
      table={
        <DataTable
          caption="Every synthesized design"
          head={[
            "Design",
            "Layer",
            "Activation bits",
            "Group",
            "Cells (re-run)",
            "Cells (recorded)",
            "Gates per weight",
          ]}
          rows={gates.designs.map((d) => [
            d.label,
            layer(d),
            d.activation_bits,
            d.group ?? "",
            d.cells.toLocaleString("en-US"),
            d.recorded_cells.toLocaleString("en-US"),
            d.gates_per_weight.toFixed(1),
          ])}
        />
      }
    >
      <BarRows
        max={450}
        axis={{ ticks: [0, 100, 200, 300, 400], format: (v) => String(v) }}
        bars={featured.map((d) => ({
          key: d.file,
          name: d.doc_label ?? d.label,
          label: d.doc_label ?? d.label,
          value: d.gates_per_weight,
          valueLabel: d.gates_per_weight.toFixed(1),
          sublabel: d.kind === "mac" ? "plus the weight fetch" : undefined,
          color: KIND_COLOR[d.kind] ?? "var(--blue)",
          detail: `${d.cells.toLocaleString("en-US")} cells for ${d.weights.toLocaleString("en-US")} weights`,
        }))}
      />
      <ul className="legend">
        <li>
          <span className="key-bar" style={{ background: "var(--ink-2)" }} />
          Stored weights (GPU-style)
        </li>
        <li>
          <span className="key-bar" style={{ background: "var(--blue)" }} />
          Wired 4-bit weights
        </li>
        <li>
          <span className="key-bar" style={{ background: "var(--accent-mark)" }} />
          Wired ternary weights
        </li>
      </ul>
    </Figure>
  );
}

/* 5. Shared partial sums -------------------------------------------------------------------- */

export function SpwFigure() {
  const groups = [1, 3, 4, 5, 6, 7, 8];
  return (
    <Figure
      title={`Sharing partial sums saves more as layers get wider: up to ${Math.max(...spw.layers.flatMap((l) => l.points.map((p) => p.saving)))}x fewer adds`}
      subtitle="Adds for a hardwired ternary layer when every signed combination of a group of g inputs is built once and shared by every output row, against adding each row's inputs directly."
      data={{ file: "data/spw.json", provenance: spw.provenance }}
      sources={[
        from(DESIGN, "Invention 2"),
        from(RESULTS, "SPW add-count model", "RESULTS.md, SPW model"),
      ]}
      note={`An add-count model, not a synthesis: random ternary weights with ${stated(spw.provenance.about, /(\d+% zeros)/, "the share of zero weights")}. Re-run for this site: ${spw.matches_recorded ? "every ratio matches the recorded output" : "the ratios differ from the recorded output"}.`}
      table={
        <DataTable
          caption="Saving by layer and group size"
          head={["Layer", ...groups.map((g) => `g = ${g}`)]}
          rows={spw.layers.map((l) => [
            `${l.inputs.toLocaleString("en-US")} x ${l.outputs.toLocaleString("en-US")}`,
            ...groups.map((g) => {
              const p = l.points.find((x) => x.group === g);
              return p ? `${p.saving.toFixed(2)}x` : "not run";
            }),
          ])}
        />
      }
    >
      <SpwPlot />
    </Figure>
  );
}

/* 6. Where a million tokens' dollars go ----------------------------------------------------- */

const TERM_COLOR: Record<string, string> = {
  capital: "var(--accent-mark)",
  nre: "var(--blue)",
  memory: "var(--cat-3)",
  electricity: "var(--cat-4)",
};
const usd = (v: number) => `$${Number(v.toPrecision(2))}`;

export function CostBreakdownFigure() {
  const cases = [
    { key: "central", label: "Central case" },
    { key: "low", label: "Pessimistic case" },
    { key: "high", label: "Optimistic case" },
  ] as const;
  const c = costBreakdown.cases.central;
  const share = (k: string) => percent(c.terms.find((t) => t.key === k)?.share ?? 0);
  return (
    <Figure
      title={`Capital is ${share("capital")} of a million tokens' cost; electricity only ${share("electricity")}`}
      subtitle="Dollars per million tokens on the wired fleet, split into the terms the cost model adds. Once energy is nearly free, the price of the silicon dominates."
      data={{ file: "data/cost-breakdown.json", provenance: costBreakdown.provenance }}
      sources={[from(DESIGN, "Multiplier budget")]}
      table={
        <DataTable
          caption="Dollars per million tokens, by term and case"
          head={["Term", "Pessimistic", "Central", "Optimistic"]}
          rows={[
            ...c.terms.map((t) => [
              t.label,
              ...(["low", "central", "high"] as const).map((k) => {
                const x = costBreakdown.cases[k].terms.find((y) => y.key === t.key);
                return x ? `${usd(x.usd)} (${percent(x.share)})` : "";
              }),
            ]),
            [
              "Total",
              ...(["low", "central", "high"] as const).map((k) =>
                usd(costBreakdown.cases[k].total_usd_per_Mtok),
              ),
            ],
          ]}
        />
      }
    >
      {cases.map((k, i) => {
        const x = costBreakdown.cases[k.key];
        return (
          <Fragment key={k.key}>
            {i === 1 && (
              <p className="fig-note" style={{ margin: "22px 0 10px" }}>
                The other cases, for comparison:
              </p>
            )}
            <StackBar
              label={k.label}
              total={`${usd(x.total_usd_per_Mtok)} per million tokens`}
              showKey={i === 0}
              segments={x.terms.map((t) => ({
                key: t.key,
                label: t.label,
                value: t.usd,
                color: TERM_COLOR[t.key] ?? "var(--neutral-mark)",
                valueLabel: `${percent(t.share)}, ${usd(t.usd)}`,
              }))}
            />
          </Fragment>
        );
      })}
    </Figure>
  );
}

/* 7. Where a decode step's energy goes ------------------------------------------------------ */

export function DecodeFigure() {
  const b = decodeEnergy.b2024;
  const total = b.terms.reduce((a, t) => a + t.joules, 0);
  const colors: Record<string, string> = {
    weights: "var(--accent-mark)",
    kv: "var(--blue)",
    math: "var(--neutral-mark)",
  };
  const c = decodeEnergy.coefficients;
  const bytes = b.terms.filter((t) => t.key !== "math").reduce((a, t) => a + t.joules, 0) / total;
  // The baseline as the survey describes it, on the line the energy model cites.
  const base = readRepo(SURVEY).split("\n")[b.source.line - 1] ?? "";
  const said = (re: RegExp, what: string) => stated(base, re, `in Baseline B2024, ${what}`);
  const baseline = [
    said(/(Llama-\S+-class) dense/, "the model class"),
    said(/dense transformer in (\w+) on/, "the number format"),
    `${said(/\((\d+) GPUs/, "the GPU count")} ${said(/ on (H\d+)s /, "the GPU")}s`,
    `${said(/~(\d+K) mean context/, "the mean context")} context`,
  ].join(", ");
  return (
    <Figure
      title={`About ${Math.round(bytes * 100)}% of a 2024 token's energy is moving bytes, not doing math`}
      subtitle={`One generated token of the B2024 baseline (${baseline}), at H100's measured ${c.pj_per_hbm_bit} pJ per HBM bit and ${c.pj_per_flop} pJ per tensor-core FLOP.`}
      data={{ file: "data/decode-energy.json", provenance: decodeEnergy.provenance }}
      sources={[{ path: SURVEY, startLine: b.source.line, label: "The survey, Baseline B2024" }]}
      note={`Derived, not measured: each token reads ~${fmt(b.gb_per_token)} GB from HBM (its batch's share of the weights plus its own ${fmt(b.kv_gb_per_sequence)} GB of KV cache, with ~${fmt(b.sequences_beside_weights, 3)} sequences fitting beside the weights). Static power is not counted.`}
      table={
        <DataTable
          caption="Energy of one B2024 token"
          head={["Term", "Joules", "Share"]}
          rows={[
            ...b.terms.map((t) => [t.label, fmt(t.joules), percent(t.joules / total)]),
            ["Total", fmt(total), "100%"],
          ]}
        />
      }
    >
      <StackBar
        label="One B2024 token"
        total={`~${fmt(total, 2)} J`}
        segments={b.terms.map((t) => ({
          key: t.key,
          label: t.label,
          value: t.joules,
          color: colors[t.key] ?? "var(--neutral-mark)",
          valueLabel: `${fmt(t.joules, 2)} J`,
        }))}
      />
    </Figure>
  );
}

export function EnergyLadderFigure() {
  const wireTest = wireExperiment().order;
  const tone: Record<string, RangeRow["tone"]> = {
    hbm8: "neutral",
    flop2: "neutral",
    taalas: "blue",
    corerope: "accent",
  };
  const rows: RangeRow[] = decodeEnergy.per_weight.map((w) => ({
    key: w.key,
    name: w.label,
    label: w.label,
    sublabel: w.kind,
    central: w.pj,
    low: "low" in w ? (w.low as number) : null,
    high: "high" in w ? (w.high as number) : null,
    tone: tone[w.key] ?? "neutral",
    hollow: w.key === "corerope",
    emphasis: w.key === "corerope",
  }));
  return (
    <Figure
      title="What one weight costs per token, from fetching it to wiring it"
      subtitle={`Energy per weight per token. The hollow dot is an assumption, not a measurement: experiment ${wireTest} tests it.`}
      data={{ file: "data/decode-energy.json", provenance: decodeEnergy.provenance }}
      sources={decodeEnergy.per_weight
        .map((w) => ({
          path: w.source.file,
          startLine: w.source.line,
          label: `${w.source.file.split("/").pop()}`,
        }))
        .filter(
          (s, i, a) => a.findIndex((x) => x.path === s.path && x.startLine === s.startLine) === i,
        )}
      table={
        <DataTable
          caption="Energy per weight per token"
          head={["Step", "Picojoules", "What it is"]}
          rows={decodeEnergy.per_weight.map((w) => [
            w.label,
            "low" in w
              ? `${fmt(w.pj)} (${fmt(w.low as number)} to ${fmt(w.high as number)})`
              : fmt(w.pj),
            w.kind,
          ])}
        />
      }
    >
      <RangeRows
        rows={rows}
        domain={[0.01, 1000]}
        format={(v) => `${fmt(v)} pJ`}
        tickFormat={(v) => `${tickLabel(v)} pJ`}
        axisLabel="Picojoules per weight per token (log scale)"
      />
    </Figure>
  );
}

export function BatchFigure() {
  const s = decodeEnergy.batch;
  return (
    <Figure
      title="Batching hides weight reads only until arithmetic binds"
      subtitle={`Per-token energy to read a ${s.model} model's weights from HBM, shared across a batch, against the ${fmt(s.math_joules, 2)} J of arithmetic each token needs. Above the crossover batch, fewer bits stop helping on a GPU.`}
      data={{ file: "data/decode-energy.json", provenance: decodeEnergy.provenance }}
      sources={[
        { path: s.source.file, startLine: s.source.line, label: "Hardware note, Inferences" },
      ]}
      table={
        <DataTable
          caption="Crossover batch by weight precision"
          head={["Weights", "Read energy at batch 1", "Crossover batch"]}
          rows={s.series.map((x) => [
            x.label,
            `${fmt(x.points[0]?.joules ?? Number.NaN)} J`,
            fmt(x.crossover_batch, 3),
          ])}
        />
      }
    >
      <BatchPlot />
    </Figure>
  );
}

/* 8. The lever budget: a million on paper, about a thousand in practice --------------------- */

function budgetRows(key: "b2024" | "b2026"): RangeRow[] {
  const fam = new Map(levers.families.map((f) => [f.key, f.label]));
  return levers.budgets[key].rows.map((r, i) => ({
    key: `${key}-${i}`,
    name: r.label,
    label: r.label,
    sublabel: r.note || undefined,
    low: r.low,
    central: r.central,
    high: r.high,
    group: fam.get(r.family) ?? r.family,
    tone:
      r.kind === "total"
        ? r.naive
          ? "neutral"
          : "accent"
        : r.kind === "subtotal"
          ? "blue"
          : "neutral",
    hollow: r.naive,
    emphasis: r.kind !== "lever",
  }));
}

export function BudgetFigure() {
  const b26 = levers.budgets.b2026;
  const b24 = levers.budgets.b2024;
  const totalOf = (k: "b2024" | "b2026", naive: boolean, what = "") =>
    levers.budgets[k].rows.find(
      (r) => r.kind === "total" && r.naive === naive && r.label.includes(what),
    )?.central ?? Number.NaN;
  const naive = (k: "b2024" | "b2026") => totalOf(k, true);
  const cost = (k: "b2024" | "b2026") => totalOf(k, false, "cost");
  const table = (k: "b2024" | "b2026") => (
    <DataTable
      caption={levers.budgets[k].heading}
      head={["Lever", "Low", "Central", "High", "Overlap treatment"]}
      rows={levers.budgets[k].rows.map((r) => [
        r.label,
        r.low === null ? "" : `${fmt(r.low)}x`,
        `${fmt(r.central)}x`,
        r.high === null ? "" : `${fmt(r.high)}x`,
        r.note,
      ])}
    />
  );
  return (
    <Figure
      title={`Multiplied naively the levers promise ${times(naive("b2026"))} against B2026 and ${times(naive("b2024"))} against B2024; overlap-adjusted, about ${times(cost("b2026"))} and ${times(cost("b2024"))}`}
      subtitle="Each lever's standalone multiplier (low to high, dot at central), grouped by the term it attacks, then the overlap-adjusted subtotals and totals. Hollow dots are the naive product of every central row."
      data={{ file: "data/levers.json", provenance: levers.provenance }}
      sources={[
        { path: SURVEY, startLine: b26.line, label: "Table B" },
        { path: SURVEY, startLine: b24.line, label: "Table A" },
      ]}
      table={
        <>
          <p className="fig-note" style={{ margin: "4px 0 8px" }}>
            {b26.heading}
          </p>
          {table("b2026")}
          <p className="fig-note" style={{ margin: "16px 0 8px" }}>
            {b24.heading}
          </p>
          {table("b2024")}
        </>
      }
      note="Every compounding factor here is the survey's inference: no source has measured these levers together at frontier scale."
    >
      <Tabs label="Baseline" labels={["Against B2026", "Against B2024"]}>
        <RangeRows
          rows={budgetRows("b2026")}
          domain={[0.5, 1e6]}
          target={{ value: TARGET, label: `${TARGET}x` }}
          axisLabel="Times cheaper per solved task (log scale)"
        />
        <RangeRows
          rows={budgetRows("b2024")}
          domain={[0.5, 1e6]}
          target={{ value: TARGET, label: `${TARGET}x` }}
          axisLabel="Times cheaper per solved task (log scale)"
        />
      </Tabs>
    </Figure>
  );
}

/* Baseline: why per solved task, and what the market already gives -------------------------- */

export function TokensFigure() {
  const t = tokensPerTask;
  const NOTE = "research/notes/decoding_test_time.md";
  const k = (v: number) => `~${Math.round(v / 1000)}k`;
  const top = t.models[0];
  const low = t.models.at(-1);
  return (
    <Figure
      title={`At near-equal scores, output per task differs ${top && low ? (top.tokens / low.tokens).toFixed(1) : ""}x`}
      subtitle="Output tokens per task on the Artificial Analysis Intelligence Index v5 (October 2026, max effort). A cheaper token buys nothing if a model spends more of them."
      data={{ file: "data/tokens-per-task.json", provenance: t.provenance }}
      sources={[
        { path: NOTE, startLine: t.lines.models, label: "Decoding note, tokens per task" },
        { path: NOTE, startLine: t.lines.scores, label: "index scores" },
      ]}
      note={`The index's median output per task rose from ${k(t.median.v4_3)} (v4.3) to ${k(t.median.v5)} tokens (v5) in one revision.`}
      table={
        <DataTable
          caption="Output tokens per task"
          head={["Model", "Output tokens per task", "Index v5 score"]}
          rows={t.models.map((m) => [m.label, k(m.tokens), m.score ?? "not given"])}
        />
      }
    >
      <ul className="legend legend-top">
        <li>
          <span className="key-bar" style={{ background: "var(--accent-mark)" }} />
          Index score given in the note
        </li>
        <li>
          <span className="key-bar" style={{ background: "var(--neutral-mark)" }} />
          No score given
        </li>
      </ul>
      <BarRows
        max={125000}
        axis={{
          ticks: [0, 25000, 50000, 75000, 100000, 125000],
          format: (v) => (v === 0 ? "0" : `${v / 1000}k`),
        }}
        bars={t.models.map((m) => ({
          key: m.label,
          name: m.label,
          label: m.label,
          sublabel: m.score !== null ? `Index score ${m.score}` : undefined,
          value: m.tokens,
          valueLabel: k(m.tokens),
          color: m.score !== null ? "var(--accent-mark)" : "var(--neutral-mark)",
        }))}
      />
    </Figure>
  );
}

export function MarketFigure() {
  const m = marketTrend;
  const rates = [...m.rates].sort((a, b) => b.by_nov_2026 - a.by_nov_2026);
  // The range is the market's: the algorithmic-only rate has hardware removed, so it is not a price.
  const prices = rates.filter((r) => r.key !== "algo");
  const hi = prices[0];
  const lo = prices.at(-1);
  return (
    <Figure
      title={`The market trend alone gives ${lo ? times(lo.by_nov_2026) : ""} to ${hi ? times(hi.by_nov_2026) : ""} from ${m.start} to November 2026`}
      subtitle={`Each published rate of price decline at constant capability, compounded over the ${m.years_to_nov_2026} years since ${m.start}. Against 2024, much of 1000x is what the market already does.`}
      data={{ file: "data/market-trend.json", provenance: m.provenance }}
      sources={[{ path: SURVEY, startLine: m.table.line, label: "The survey, market trend" }]}
      note="Derived: rate to the power of the years, as the survey computes it. These are prices, not costs, so margin compression inflates the headline."
      table={
        <DataTable
          caption="Market trend estimates"
          head={["Estimate", "Per year", "By November 2026", "Years to 1000x"]}
          rows={rates.map((r) => [
            r.label,
            `${r.per_year}x`,
            times(r.by_nov_2026),
            r.years_to_1000x.toFixed(1),
          ])}
        />
      }
    >
      <RangeRows
        rows={rates.map((r) => ({
          key: r.key,
          name: r.label,
          label: r.label,
          sublabel: `${r.per_year}x per year; 1000x in ${r.years_to_1000x.toFixed(1)} years`,
          central: r.by_nov_2026,
          tone: r.key === "algo" ? "neutral" : "blue",
        }))}
        domain={[1, 10000]}
        target={{ value: TARGET, label: `${TARGET}x` }}
        axisLabel="Times cheaper at constant capability by November 2026 (log scale)"
      />
    </Figure>
  );
}
