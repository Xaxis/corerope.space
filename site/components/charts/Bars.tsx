import type { ReactNode } from "react";
import { TipLayer } from "./TipLayer";

export type Bar = {
  key: string;
  label: ReactNode;
  name: string;
  value: number;
  /** Shown at the bar's end, instead of the plain value. */
  valueLabel: string;
  color: string;
  sublabel?: string;
  detail?: string;
};

/** Horizontal bars from a zero baseline, for comparing magnitudes. HTML, so text never scales. */
export function BarRows({
  bars,
  max: wanted,
  axis,
}: {
  bars: Bar[];
  max: number;
  axis?: { ticks: number[]; format: (v: number) => string };
}) {
  // Headroom past the longest bar, so its value label stays inside the chart.
  const max = Math.max(wanted, ...bars.map((b) => b.value * 1.14));
  return (
    <TipLayer>
      <div className="rows bar-rows">
        {bars.map((b) => {
          const w = Math.max(0.4, (b.value / max) * 100);
          return (
            <div className="bar-row" key={b.key} style={{ display: "contents" }}>
              <div className="row-label">
                {b.label}
                {b.sublabel && <small>{b.sublabel}</small>}
              </div>
              <div className="row-track bar-track">
                {axis?.ticks.map((t) => (
                  <span
                    key={t}
                    className="bar-grid"
                    style={{ left: `${(t / max) * 100}%` }}
                    aria-hidden="true"
                  />
                ))}
                <div
                  className="bar"
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: lets keyboard users read each bar's tooltip
                  tabIndex={0}
                  role="img"
                  aria-label={`${b.name}: ${b.valueLabel}`}
                  data-tip-title={b.name}
                  data-tip-value={b.valueLabel}
                  data-tip-detail={b.detail ?? ""}
                  style={{ width: `${w}%`, background: b.color }}
                />
                <span className="bar-value" style={{ left: `${w}%` }}>
                  {b.valueLabel}
                </span>
              </div>
            </div>
          );
        })}
        {axis && (
          <>
            <div className="axis-spacer" />
            <div className="row-track axis-row" aria-hidden="true">
              {axis.ticks.map((t) => (
                <span key={t} className="bar-tick" style={{ left: `${(t / max) * 100}%` }}>
                  {axis.format(t)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </TipLayer>
  );
}

export type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
  valueLabel: string;
};

/**
 * One whole split into parts: a 100% bar with a 2px gap between segments, and a key underneath
 * that names each part and gives its value (so identity never rests on colour alone).
 */
export function StackBar({
  segments,
  label,
  total,
  showKey = true,
}: {
  segments: Segment[];
  label?: ReactNode;
  total?: string;
  showKey?: boolean;
}) {
  const sum = segments.reduce((a, s) => a + s.value, 0);
  return (
    <TipLayer>
      <div className="stack">
        {(label || total) && (
          <div className="stack-head">
            <span>{label}</span>
            {total && <span className="stack-total">{total}</span>}
          </div>
        )}
        <div className="stack-bar">
          {segments.map((s) => {
            const share = s.value / sum;
            return (
              <div
                key={s.key}
                className="stack-seg"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: lets keyboard users read each part's tooltip
                tabIndex={0}
                role="img"
                aria-label={`${s.label}: ${s.valueLabel}, ${Math.round(share * 100)}%`}
                data-tip-title={s.label}
                data-tip-value={`${s.valueLabel} (${Math.round(share * 100)}%)`}
                style={{ flexGrow: share * 1000, flexBasis: 0, background: s.color }}
              />
            );
          })}
        </div>
        {showKey && (
          <ul className="legend stack-key">
            {segments.map((s) => (
              <li key={s.key}>
                <span className="key-bar" style={{ background: s.color }} />
                <span>
                  {s.label} <b>{s.valueLabel}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </TipLayer>
  );
}
