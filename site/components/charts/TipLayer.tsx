"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";

type Tip = { x: number; y: number; title: string; value: string; detail: string } | null;

/**
 * Hover and keyboard focus for the marks inside: any element with data-tip-value (and optionally
 * data-tip-title, data-tip-detail) shows a tooltip above itself. Values are set as text, never HTML.
 * The tooltip only repeats what the chart's table and labels already give.
 */
export function TipLayer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);
  const show = useCallback((target: EventTarget | null) => {
    const root = ref.current;
    const el =
      target instanceof Element
        ? target.closest<HTMLElement | SVGElement>("[data-tip-value]")
        : null;
    if (!root || !el || !root.contains(el)) return setTip(null);
    const r = el.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const x = Math.min(Math.max(r.left + r.width / 2 - box.left, 70), box.width - 70);
    setTip({
      x,
      y: r.top - box.top,
      title: el.getAttribute("data-tip-title") ?? "",
      value: el.getAttribute("data-tip-value") ?? "",
      detail: el.getAttribute("data-tip-detail") ?? "",
    });
  }, []);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only enhance; every value is in the table view
    <div
      ref={ref}
      style={{ position: "relative" }}
      onPointerOver={(e) => show(e.target)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => show(e.target)}
      onBlur={() => setTip(null)}
      // WCAG 1.4.13: what appears on hover or focus can be dismissed without moving.
      onKeyDown={(e) => {
        if (e.key === "Escape") setTip(null);
      }}
    >
      {children}
      {/* Hidden from screen readers: each mark's own label already says all of this. */}
      {tip && (
        <div className="tip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <b>{tip.value}</b>
          {tip.title && <span>{tip.title}</span>}
          {tip.detail && <span style={{ display: "block", opacity: 0.8 }}>{tip.detail}</span>}
        </div>
      )}
    </div>
  );
}
