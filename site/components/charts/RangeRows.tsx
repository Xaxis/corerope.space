import { Fragment, type ReactNode } from "react";
import { logTicks, pc, scale, tickLabel, times } from "@/lib/scale";
import { TipLayer } from "./TipLayer";

export type Tone = "accent" | "blue" | "neutral" | "ink";

export type RangeRow = {
  key: string;
  label: ReactNode;
  /** Plain-text name, for the tooltip and the accessible label. */
  name: string;
  sublabel?: string;
  low?: number | null;
  central: number;
  high?: number | null;
  tone?: Tone;
  /** Hollow dot: a value with no range (the naive product). */
  hollow?: boolean;
  /** Rows sharing a group sit under its heading. */
  group?: string;
  emphasis?: boolean;
  detail?: string;
};

const COLOR: Record<Tone, string> = {
  accent: "var(--accent-mark)",
  blue: "var(--blue)",
  neutral: "var(--neutral-mark)",
  ink: "var(--ink)",
};

type Props = {
  rows: RangeRow[];
  domain: [number, number];
  /** A dashed reference line, e.g. the 1000x target. */
  target?: { value: number; label: string };
  format?: (v: number) => string;
  tickFormat?: (v: number) => string;
  axisLabel?: string;
};

/**
 * Dot-and-whisker rows on a log axis: the dot is the central case, the whisker runs from low to
 * high. Labels are HTML beside each track, and the track places its marks by percentage, so the
 * chart reads at any width without its text shrinking.
 */
export function RangeRows({
  rows,
  domain,
  target,
  format = times,
  tickFormat = (v) => tickLabel(v, "x"),
  axisLabel,
}: Props) {
  const x = scale({ type: "log", domain });
  const ticks = logTicks(domain);
  // On a phone only the ends and the target (or the middle) keep their labels.
  const keep = new Set([
    ticks[0],
    ticks.at(-1),
    target ? target.value : ticks[Math.floor(ticks.length / 2)],
  ]);
  let lastGroup: string | undefined;
  return (
    <TipLayer>
      <div className="rows">
        {rows.map((r) => {
          const header = r.group && r.group !== lastGroup ? r.group : null;
          lastGroup = r.group;
          const color = COLOR[r.tone ?? "blue"];
          const lo = r.low ?? r.central;
          const hi = r.high ?? r.central;
          const right = Math.max(hi, r.central);
          // The value goes right of the whisker if it fits, else left of it, else above the dot.
          const place =
            x(right) < 0.86 ? "right" : x(Math.min(lo, r.central)) > 0.12 ? "left" : "above";
          const range =
            r.low != null && r.high != null ? ` (range ${format(r.low)} to ${format(r.high)})` : "";
          return (
            <Fragment key={r.key}>
              {header && <div className="row-group">{header}</div>}
              <div className="row-label" style={r.emphasis ? { fontWeight: 620 } : undefined}>
                {r.label}
                {r.sublabel && <small>{r.sublabel}</small>}
              </div>
              <div className="row-track">
                <svg aria-hidden="true">
                  {ticks.map((t) => (
                    <line
                      key={t}
                      x1={pc(x(t))}
                      x2={pc(x(t))}
                      y1="0"
                      y2="100%"
                      stroke="var(--grid)"
                      strokeWidth="1"
                    />
                  ))}
                  {target && (
                    <line
                      className="target"
                      x1={pc(x(target.value))}
                      x2={pc(x(target.value))}
                      y1="0"
                      y2="100%"
                    />
                  )}
                  {(r.low != null || r.high != null) && (
                    <line
                      x1={pc(x(lo))}
                      x2={pc(x(hi))}
                      y1="50%"
                      y2="50%"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                  {r.low != null && (
                    <line
                      x1={pc(x(lo))}
                      x2={pc(x(lo))}
                      y1="35%"
                      y2="65%"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                  {r.high != null && (
                    <line
                      x1={pc(x(hi))}
                      x2={pc(x(hi))}
                      y1="35%"
                      y2="65%"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                  <circle
                    cx={pc(x(r.central))}
                    cy="50%"
                    r={r.emphasis ? 6.5 : 5.5}
                    fill={r.hollow ? "var(--surface)" : color}
                    stroke={r.hollow ? color : "var(--surface)"}
                    strokeWidth="2"
                  />
                  <text
                    x={pc(
                      place === "right"
                        ? x(right)
                        : place === "left"
                          ? x(Math.min(lo, r.central))
                          : x(r.central),
                    )}
                    dx={place === "right" ? 10 : place === "left" ? -10 : 0}
                    y="50%"
                    dy={place === "above" ? -10 : "0.35em"}
                    textAnchor={place === "right" ? "start" : place === "left" ? "end" : "middle"}
                    className={r.emphasis ? "strong" : "ink2"}
                    style={{
                      fill: r.emphasis ? "var(--ink)" : "var(--ink-2)",
                      fontSize: 12.5,
                      fontWeight: r.emphasis ? 650 : 500,
                    }}
                  >
                    {format(r.central)}
                  </text>
                </svg>
                <div
                  // biome-ignore lint/a11y/noNoninteractiveTabindex: lets keyboard users read each row's tooltip
                  tabIndex={0}
                  role="img"
                  aria-label={`${r.name}: ${format(r.central)}${range}`}
                  data-tip-title={r.name}
                  data-tip-value={`${format(r.central)}${r.low != null && r.high != null ? `, ${format(r.low)} to ${format(r.high)}` : ""}`}
                  data-tip-detail={r.detail ?? ""}
                  style={{
                    position: "absolute",
                    inset: 0,
                    left: pc(x(lo)),
                    width: pc(Math.max(0.03, x(hi) - x(lo))),
                    transform: "translateX(-12px)",
                    paddingInline: 12,
                    boxSizing: "content-box",
                  }}
                />
              </div>
            </Fragment>
          );
        })}
        <div className="axis-spacer" />
        <div className="row-track axis-row">
          <svg aria-hidden="true">
            {ticks.map((t) =>
              target && t === target.value ? null : (
                <text
                  key={t}
                  x={pc(x(t))}
                  y="14"
                  textAnchor={x(t) > 0.97 ? "end" : x(t) < 0.03 ? "start" : "middle"}
                  className={keep.has(t) ? undefined : "tick-minor"}
                >
                  {tickFormat(t)}
                </text>
              ),
            )}
            {target && (
              <text
                x={pc(x(target.value))}
                y="14"
                textAnchor="middle"
                style={{ fill: "var(--ink)", fontWeight: 650 }}
              >
                {target.label}
              </text>
            )}
          </svg>
        </div>
        {axisLabel && (
          <>
            <div className="axis-spacer" />
            <div
              style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", paddingTop: 4 }}
            >
              {axisLabel}
            </div>
          </>
        )}
      </div>
    </TipLayer>
  );
}
