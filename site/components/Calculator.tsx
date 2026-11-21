"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  costTerms,
  fromPosition,
  GROUPS,
  PARAMS,
  type ParamKey,
  type Params,
  run,
  STEPS,
  toPosition,
} from "@/lib/costmodel";
import { millions } from "@/lib/presets";
import { pc, percent, scale, times } from "@/lib/scale";
import { StackBar } from "./charts/Bars";

type Scenario = "fabric" | "as_written";
type Presets = Record<Scenario, [Params, Params, Params]>;

const CASES = ["Pessimistic", "Central", "Optimistic"] as const;
/** Each scenario, described with its central case's own NRE and GPU share. */
const SCENARIOS: { key: Scenario; label: string; help: (p: Params) => string }[] = [
  {
    key: "fabric",
    label: "Via-programmed fabric",
    help: (p) =>
      `The design doc's headline: one via mask per model (~${millions(p.nre_usd)} NRE) and ${percent(p.gpu_share)} GPU fallback.`,
  },
  {
    key: "as_written",
    label: "New chip per model",
    help: (p) =>
      `S as written in costmodel.py: a full mask set per model (~${millions(p.nre_usd)} NRE) and ${percent(p.gpu_share)} GPU fallback.`,
  },
];
const KEYS = PARAMS.map((p) => p.key);
const TERM_COLOR: Record<string, string> = {
  capital: "var(--accent-mark)",
  nre: "var(--blue)",
  memory: "var(--cat-3)",
  electricity: "var(--cat-4)",
};

function same(a: Params, b: Params): boolean {
  return KEYS.every((k) => a[k] === b[k]);
}

/** Read ?scenario=&case= and any parameter overrides from the address bar. */
function fromUrl(presets: Presets): { scenario: Scenario; base: number; params: Params } | null {
  const q = new URLSearchParams(window.location.search);
  if (![...q.keys()].length) return null;
  const scenario: Scenario = q.get("scenario") === "as_written" ? "as_written" : "fabric";
  const c = CASES.findIndex((x) => x.toLowerCase() === q.get("case"));
  const base = c === -1 ? 1 : c;
  const params = { ...presets[scenario][base] } as Params;
  for (const spec of PARAMS) {
    const v = q.get(spec.key);
    if (v === null) continue;
    const n = Number(v);
    const floor = spec.scale === "log0" ? 0 : spec.min;
    if (Number.isFinite(n) && n >= floor && n <= spec.max) params[spec.key] = n;
  }
  return { scenario, base, params };
}

function toUrl(scenario: Scenario, base: number, params: Params, presets: Presets): string {
  const q = new URLSearchParams();
  if (scenario !== "fabric") q.set("scenario", scenario);
  if (base !== 1) q.set("case", (CASES[base] ?? "Central").toLowerCase());
  const preset = presets[scenario][base];
  for (const k of KEYS) if (preset && params[k] !== preset[k]) q.set(k, String(params[k]));
  const s = q.toString();
  return `${window.location.pathname}${s ? `?${s}` : ""}${window.location.hash}`;
}

/** A small log meter: where a multiplier sits between 1x and 100,000x, against the 1000x target. */
function Meter({ value, central }: { value: number; central?: number }) {
  const x = scale({ type: "log", domain: [1, 100000] });
  const f = Math.min(1, Math.max(0, x(value)));
  return (
    <svg className="meter" aria-hidden="true">
      <line
        x1="0"
        x2="100%"
        y1="50%"
        y2="50%"
        stroke="var(--grid)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="0"
        x2={pc(f)}
        y1="50%"
        y2="50%"
        stroke="var(--accent-mark)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line className="target" x1={pc(x(1000))} x2={pc(x(1000))} y1="0" y2="100%" />
      {central !== undefined && (
        <circle
          cx={pc(Math.min(1, x(central)))}
          cy="50%"
          r="3"
          fill="var(--surface)"
          stroke="var(--ink-2)"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

export function Calculator({ presets }: { presets: Presets }) {
  const [scenario, setScenario] = useState<Scenario>("fabric");
  const [base, setBase] = useState(1);
  const [params, setParams] = useState<Params>(presets.fabric[1]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const u = fromUrl(presets);
    if (u) {
      setScenario(u.scenario);
      setBase(u.base);
      setParams(u.params);
    }
    setReady(true);
  }, [presets]);

  // Keep the address bar on the case shown, and its #anchor. Write only when the address changes:
  // Next answers every replaceState with a router transition, which re-renders this component, so
  // writing an address it already has kept the page rewriting its own history after it loaded.
  useEffect(() => {
    if (!ready) return;
    const want = toUrl(scenario, base, params, presets);
    const { pathname, search, hash } = window.location;
    if (want !== `${pathname}${search}${hash}`) window.history.replaceState(null, "", want);
  }, [ready, scenario, base, params, presets]);

  const r = useMemo(() => run(params), [params]);
  const centralRun = useMemo(() => run(presets[scenario][1]), [presets, scenario]);
  const preset = presets[scenario][base] as Params;
  const edited = !same(params, preset);
  const terms = costTerms(params, r);
  const total = terms.reduce((a, t) => a + t.usd, 0);

  const choose = useCallback(
    (s: Scenario, b: number) => {
      setScenario(s);
      setBase(b);
      setParams(presets[s][b] as Params);
    },
    [presets],
  );
  const set = (k: ParamKey, v: number) => setParams((p) => ({ ...p, [k]: v }));

  const outputs = [
    {
      key: "energy_x_per_task",
      label: "Less energy per solved task",
      v: r.energy_x_per_task,
      c: centralRun.energy_x_per_task,
      task: true,
    },
    {
      key: "usd_x_per_task",
      label: "Lower cost per solved task",
      v: r.usd_x_per_task,
      c: centralRun.usd_x_per_task,
      task: true,
    },
    {
      key: "energy_x_per_token",
      label: "Less energy per token",
      v: r.energy_x_per_token,
      c: centralRun.energy_x_per_token,
      task: false,
    },
    {
      key: "usd_x_per_token",
      label: "Lower cost per token",
      v: r.usd_x_per_token,
      c: centralRun.usd_x_per_token,
      task: false,
    },
  ];
  const cap = params.gpu_share > 0 ? 1 / params.gpu_share : null;

  return (
    <div className="calc">
      <div className="calc-bar">
        <fieldset className="calc-choice">
          <legend className="calc-label">Scenario</legend>
          <div className="seg">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={scenario === s.key}
                title={s.help(presets[s.key][1])}
                onClick={() => choose(s.key, base)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="calc-choice">
          <legend className="calc-label">Preset</legend>
          <div className="seg">
            {CASES.map((c, i) => (
              <button
                key={c}
                type="button"
                aria-pressed={base === i && !edited}
                onClick={() => choose(scenario, i)}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>
        {edited && (
          <button type="button" className="btn calc-reset" onClick={() => choose(scenario, base)}>
            Reset to {CASES[base]?.toLowerCase()}
          </button>
        )}
      </div>
      <p className="calc-scenario-help">
        {SCENARIOS.find((s) => s.key === scenario)?.help(presets[scenario][1])}
      </p>

      <div className="calc-grid">
        <div className="calc-inputs">
          {GROUPS.map((g) => (
            <fieldset key={g} className="calc-group">
              <legend>{g}</legend>
              {PARAMS.filter((p) => p.group === g).map((spec) => {
                const v = params[spec.key];
                const changed = v !== preset[spec.key];
                const id = `p-${spec.key}`;
                return (
                  <div key={spec.key} className={`calc-param${changed ? " changed" : ""}`}>
                    <div className="calc-param-head">
                      <label htmlFor={id}>{spec.label}</label>
                      <output htmlFor={id}>
                        <Value text={spec.format(v)} />
                      </output>
                    </div>
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={STEPS}
                      step={1}
                      value={toPosition(spec, v)}
                      aria-valuetext={spoken(spec.format(v))}
                      aria-describedby={`${id}-help`}
                      onChange={(e) => set(spec.key, fromPosition(spec, Number(e.target.value)))}
                    />
                    <p className="calc-help" id={`${id}-help`}>
                      {spec.help}
                      {changed && (
                        <>
                          {" "}
                          <span className="calc-was">
                            {CASES[base]}: <Value text={spec.format(preset[spec.key])} />.
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                );
              })}
            </fieldset>
          ))}
          {/* On a phone the results scroll away while you drag; this keeps the per-task answer in view. */}
          <div className="calc-mini" aria-hidden="true">
            <span>
              Energy per task <b>{times(r.energy_x_per_task)}</b>
            </span>
            <span>
              Cost per task <b>{times(r.usd_x_per_task)}</b>
            </span>
          </div>
        </div>

        <div className="calc-out">
          {/* What a screen reader hears as a slider moves: the answer, not all four tiles again. */}
          <p className="visually-hidden" aria-live="polite">
            {`Energy per task ${times(r.energy_x_per_task)}, cost per task ${times(r.usd_x_per_task)}.`}
          </p>
          <div className="calc-out-inner">
            <p className="calc-out-title">Against B2026, with these assumptions</p>
            <div className="calc-tiles">
              {outputs.map((o) => (
                <div key={o.key} className={`calc-tile${o.task ? " task" : ""}`}>
                  <p className="calc-tile-label">{o.label}</p>
                  <p className="calc-tile-value">{times(o.v)}</p>
                  <Meter value={o.v} central={o.c} />
                  <p className="calc-tile-foot">
                    {o.v >= 1000 ? "Passes 1000x" : `${times(1000 / o.v)} short of 1000x`}
                  </p>
                </div>
              ))}
            </div>
            <p className="calc-legend">
              Bar: 1x to 100,000x on a log scale. Dashed line: 1000x. Ring: the central preset of
              this scenario.
            </p>

            <div className={`calc-cap${cap !== null && cap < 1000 ? " bad" : ""}`}>
              <p className="calc-cap-title">The Amdahl cap</p>
              {cap === null ? (
                <p>No task falls back to GPUs, so nothing caps the gain per task.</p>
              ) : (
                <p>
                  With {percent(params.gpu_share)} of tasks on GPUs at baseline cost, no gain per
                  task can exceed <b>{times(cap)}</b>
                  {cap < 1000 ? ", below the 1000x target whatever else improves." : "."}
                </p>
              )}
            </div>

            <StackBar
              label="Dollars per million tokens, wired fleet"
              total={`$${Number(total.toPrecision(2))}`}
              segments={terms.map((t) => ({
                key: t.key,
                label: t.label,
                value: t.usd,
                color: TERM_COLOR[t.key] ?? "var(--neutral-mark)",
                valueLabel: `${percent(t.usd / total)}`,
              }))}
            />

            <dl className="calc-facts">
              <div>
                <dt>Core energy per token</dt>
                <dd>{Number(r.core_mJ.toPrecision(3))} mJ</dd>
              </div>
              <div>
                <dt>Token energy, with state and overheads</dt>
                <dd>{Number(r.tok_mJ.toPrecision(3))} mJ</dd>
              </div>
              <div>
                <dt>Throughput per core set</dt>
                <dd>{Math.round(r.tok_per_s_per_set).toLocaleString("en-US")} tok/s</dd>
              </div>
              <div>
                <dt>Baseline (B2026)</dt>
                <dd>
                  {params.base_J_per_tok} J and ${params.base_usd_per_Mtok} per M tokens
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A value as the model formats it, with a power of ten set as a superscript ("3 × 10^16"). */
function Value({ text }: { text: string }) {
  const m = /^(.*)10\^(\d+)$/.exec(text);
  return m ? (
    <>
      {m[1]}10<sup>{m[2]}</sup>
    </>
  ) : (
    text
  );
}

/** The same value as a screen reader should say it. */
function spoken(text: string): string {
  return text.replace(/×/g, "times").replace(/10\^(\d+)/, "10 to the $1");
}
