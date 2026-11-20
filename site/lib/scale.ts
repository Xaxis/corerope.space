// Scales map a value to a fraction of the plot (0 at the start, 1 at the end). Charts place marks
// with these fractions as percentages, so a chart stays crisp and readable at any width.

export type ScaleSpec = { type: "log" | "linear"; domain: [number, number] };

export function scale({ type, domain: [a, b] }: ScaleSpec): (v: number) => number {
  if (type === "log") {
    const la = Math.log10(a);
    const span = Math.log10(b) - la;
    return (v) => (Math.log10(Math.max(v, a * 1e-6)) - la) / span;
  }
  return (v) => (v - a) / (b - a);
}

/** Powers of ten across a log domain. */
export function logTicks([a, b]: [number, number]): number[] {
  const out: number[] = [];
  for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.floor(Math.log10(b) + 1e-9); e++)
    out.push(10 ** e);
  return out;
}

/** Round steps across a linear domain. */
export function linearTicks([a, b]: [number, number], count = 5): number[] {
  const raw = (b - a) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step)
    out.push(Number(v.toPrecision(12)));
  return out;
}

/** 1, 10, 100, 1,000, 10,000, 100,000, then 1M. */
export function tickLabel(v: number, suffix = ""): string {
  if (v >= 1e6) return `${v / 1e6}M${suffix}`;
  if (v >= 1) return `${v.toLocaleString("en-US")}${suffix}`;
  return `${Number(v.toPrecision(3))}${suffix}`;
}

/** A multiplier as the research writes it: 749x, 46,009x, 92x, 1.5x, 0.7x. */
export function times(v: number): string {
  if (v >= 10) return `${Math.round(v).toLocaleString("en-US")}x`;
  return `${Number(v.toPrecision(2))}x`;
}

/** A number with sensible significant figures and thousands separators. */
export function fmt(v: number, digits = 3): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1000) return Math.round(v).toLocaleString("en-US");
  return Number(v.toPrecision(digits)).toLocaleString("en-US", { maximumFractionDigits: 8 });
}

export function percent(v: number): string {
  const x = v * 100;
  if (x === 0) return "0%";
  if (x < 0.1) return `${Number(x.toPrecision(1))}%`;
  if (x < 1) return `${Number(x.toFixed(2))}%`;
  return `${Number(x.toPrecision(3))}%`;
}

/** Percent positions for SVG attributes. */
export const pc = (f: number) => `${(f * 100).toFixed(3)}%`;
