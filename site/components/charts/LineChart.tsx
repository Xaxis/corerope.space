"use client";

import { type KeyboardEvent, type PointerEvent, useId, useMemo, useRef, useState } from "react";
import { linearTicks, logTicks, pc, type ScaleSpec, scale } from "@/lib/scale";

export type Point = { x: number; y: number };
export type Series = {
  key: string;
  label: string;
  color: string;
  points: Point[];
  dashed?: boolean;
};
export type Axis = ScaleSpec & { ticks?: number[]; format: (v: number) => string; label?: string };
export type Marker = {
  x: number;
  y: number;
  label?: string;
  color: string;
  anchor?: "start" | "end" | "middle";
  dy?: number;
};

type Props = {
  series: Series[];
  x: Axis;
  y: Axis;
  height?: number;
  markers?: Marker[];
  /** A dashed level across the plot, labelled at the right, above the line unless `below`. */
  hlines?: { y: number; label: string; below?: boolean }[];
  vlines?: { x: number; label: string }[];
  /** The tooltip's heading for an x. */
  readout: (x: number) => string;
  value: (y: number, s: Series) => string;
  ariaLabel: string;
};

/**
 * A line chart that stays sharp at any width: lines are drawn in a stretched viewBox with
 * non-scaling strokes, while text and markers are placed by percentage in a second, unstretched
 * layer. A crosshair snaps to the nearest x and lists every series there (pointer or arrow keys).
 */
export function LineChart({
  series,
  x,
  y,
  height = 300,
  markers = [],
  hlines = [],
  vlines = [],
  readout,
  value,
  ariaLabel,
}: Props) {
  // A marker's label sits on a box of the card's colour: a halo hides a line crossing the letters,
  // not one crossing the space above a period ("2.02x" read as "2:02x").
  const labelBg = `label-bg-${useId().replace(/[^\w-]/g, "")}`;
  const fx = useMemo(() => scale(x), [x]);
  const fy = useMemo(() => scale(y), [y]);
  const xt = x.ticks ?? (x.type === "log" ? logTicks(x.domain) : linearTicks(x.domain));
  const yt = y.ticks ?? (y.type === "log" ? logTicks(y.domain) : linearTicks(y.domain, 4));
  const xs = useMemo(
    () =>
      [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))]
        .filter((v) => fx(v) >= -1e-9 && fx(v) <= 1 + 1e-9)
        .sort((a, b) => a - b),
    [series, fx],
  );
  const [idx, setIdx] = useState<number | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const m = { l: 52, r: 18, t: 14, b: 40 };

  const path = (pts: Point[]) =>
    pts
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${(fx(p.x) * 1000).toFixed(2)},${((1 - fy(p.y)) * 1000).toFixed(2)}`,
      )
      .join("");

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = area.current?.getBoundingClientRect();
    if (!r || xs.length === 0) return;
    const f = (e.clientX - r.left) / r.width;
    let best = 0;
    let bestD = Number.POSITIVE_INFINITY;
    xs.forEach((v, i) => {
      const d = Math.abs(fx(v) - f);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setIdx(best);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") return setIdx(null);
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setIdx((i) =>
      Math.min(
        xs.length - 1,
        Math.max(0, (i ?? Math.floor(xs.length / 2)) + (e.key === "ArrowRight" ? 1 : -1)),
      ),
    );
  };
  const at = idx === null ? null : xs[idx];
  const rows =
    at === undefined || at === null
      ? []
      : series.map((s) => ({ s, p: s.points.find((p) => p.x === at) })).filter((r) => r.p);

  return (
    <div className="plot" style={{ height: height + m.t + m.b }}>
      <div
        ref={area}
        role="img"
        aria-label={ariaLabel}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: arrow keys move the crosshair
        tabIndex={0}
        style={{
          position: "absolute",
          left: m.l,
          right: m.r,
          top: m.t,
          bottom: m.b,
          touchAction: "pan-y",
        }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setIdx(null)}
        onKeyDown={onKey}
        onBlur={() => setIdx(null)}
      >
        <svg
          className="layer"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          style={{ overflow: "hidden" }}
          aria-hidden="true"
        >
          <g className="grid">
            {yt.map((t) => (
              <line
                key={`y${t}`}
                x1="0"
                x2="1000"
                y1={(1 - fy(t)) * 1000}
                y2={(1 - fy(t)) * 1000}
              />
            ))}
            {xt.map((t) => (
              <line key={`x${t}`} y1="0" y2="1000" x1={fx(t) * 1000} x2={fx(t) * 1000} />
            ))}
          </g>
          {hlines.map((h) => (
            <line
              key={h.label}
              className="target"
              x1="0"
              x2="1000"
              y1={(1 - fy(h.y)) * 1000}
              y2={(1 - fy(h.y)) * 1000}
            />
          ))}
          {vlines.map((v) => (
            <line
              key={v.label}
              className="target"
              y1="0"
              y2="1000"
              x1={fx(v.x) * 1000}
              x2={fx(v.x) * 1000}
            />
          ))}
          {series.map((s) => (
            <path
              key={s.key}
              className="line"
              d={path(s.points)}
              stroke={s.color}
              strokeDasharray={s.dashed ? "5 5" : undefined}
            />
          ))}
          {at !== null && at !== undefined && (
            <line
              x1={fx(at) * 1000}
              x2={fx(at) * 1000}
              y1="0"
              y2="1000"
              stroke="var(--ink-2)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <svg className="layer" aria-hidden="true">
          <defs>
            <filter id={labelBg} x="-0.06" y="-0.12" width="1.12" height="1.24">
              <feFlood style={{ floodColor: "var(--surface)" }} />
              <feComposite in="SourceGraphic" operator="over" />
            </filter>
          </defs>
          <line x1="0" x2="100%" y1="100%" y2="100%" className="baseline" />
          {yt.map((t) => (
            <text key={`yl${t}`} x="0" dx="-8" y={pc(1 - fy(t))} dy="0.35em" textAnchor="end">
              {y.format(t)}
            </text>
          ))}
          {xt.map((t) => (
            <text key={`xl${t}`} x={pc(fx(t))} y="100%" dy="18" textAnchor="middle">
              {x.format(t)}
            </text>
          ))}
          {x.label && (
            <text x="50%" y="100%" dy="36" textAnchor="middle">
              {x.label}
            </text>
          )}
          {hlines.map((h) => (
            <text
              key={h.label}
              x="100%"
              dx="-6"
              y={pc(1 - fy(h.y))}
              dy={h.below ? 16 : -6}
              textAnchor="end"
              style={{ fill: "var(--ink-2)", fontWeight: 600 }}
            >
              {h.label}
            </text>
          ))}
          {vlines.map((v) => (
            <text
              key={v.label}
              x={pc(fx(v.x))}
              dx="6"
              y="0"
              dy="12"
              style={{ fill: "var(--ink-2)", fontWeight: 600 }}
            >
              {v.label}
            </text>
          ))}
          {markers.map((mk) => (
            <g key={`${mk.x}-${mk.y}-${mk.label}`}>
              <circle
                cx={pc(fx(mk.x))}
                cy={pc(1 - fy(mk.y))}
                r="5"
                fill={mk.color}
                stroke="var(--surface)"
                strokeWidth="2"
              />
              {mk.label && (
                <text
                  x={pc(fx(mk.x))}
                  y={pc(1 - fy(mk.y))}
                  dx={mk.anchor === "end" ? -9 : mk.anchor === "middle" ? 0 : 9}
                  dy={mk.dy ?? -9}
                  textAnchor={mk.anchor ?? "start"}
                  filter={`url(#${labelBg})`}
                  style={{ fill: "var(--ink)", fontWeight: 600, fontSize: 12 }}
                >
                  {mk.label}
                </text>
              )}
            </g>
          ))}
          {rows.map(({ s, p }) =>
            p ? (
              <circle
                key={s.key}
                cx={pc(fx(p.x))}
                cy={pc(1 - fy(p.y))}
                r="4.5"
                fill={s.color}
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ) : null,
          )}
        </svg>
        {at !== null && at !== undefined && rows.length > 0 && (
          <div
            className="tip"
            style={{
              left: `clamp(80px, ${fx(at) * 100}%, calc(100% - 80px))`,
              top: 0,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            <span style={{ display: "block", opacity: 0.8, marginBottom: 4 }}>{readout(at)}</span>
            {rows.map(({ s, p }) =>
              p ? (
                <span className="tip-row" key={s.key}>
                  <span className="tip-key" style={{ background: s.color }} />
                  <b style={{ display: "inline", fontSize: 13 }}>{value(p.y, s)}</b>
                  <span style={{ opacity: 0.85 }}>{s.label}</span>
                </span>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; kind?: "line" | "dot" | "dash" | "bar" }[];
}) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span
            className={
              i.kind === "dot"
                ? "key-dot"
                : i.kind === "dash"
                  ? "key-dash"
                  : i.kind === "bar"
                    ? "key-bar"
                    : "key-line"
            }
            style={i.kind === "dash" ? { color: i.color } : { background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
