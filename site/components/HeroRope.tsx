// Decoration for the home page's opening: copper wires woven through and around ferrite cores, the
// same motif as components/CoreRope.tsx at a larger scale. Hidden from assistive technology; the
// illustrated explanation is further down the page.

const STEP = 118;
const CORES = [0, 1, 2, 3].map((i) => 70 + i * STEP);
const OFFSETS = [-44, -22, 0, 22, 44];
// BITS[core][wire]: 1 threads the core, 0 goes around it.
const BITS = [
  [1, 0, 1, 1, 0],
  [0, 1, 1, 0, 1],
  [1, 1, 0, 1, 0],
  [0, 1, 1, 1, 1],
];
const CY = 0;
const RX = 24;
const RY = 74;

function wire(w: number): string {
  const y = CY + (OFFSETS[w] as number);
  const yd = w < 2 ? CY - 104 - w * 12 : CY + 104 + (w - 2) * 12;
  let d = `M -40 ${y}`;
  for (const [c, cx] of CORES.entries()) {
    if (BITS[c]?.[w]) d += ` L ${cx + 50} ${y}`;
    else
      d += ` L ${cx - 58} ${y} C ${cx - 30} ${y} ${cx - 40} ${yd} ${cx} ${yd} C ${cx + 40} ${yd} ${cx + 30} ${y} ${cx + 58} ${y}`;
  }
  return `${d} L 520 ${y}`;
}

const ring = (cx: number, half: 0 | 1) =>
  `M ${cx} ${CY - RY} A ${RX} ${RY} 0 0 ${half} ${cx} ${CY + RY}`;

export function HeroRope() {
  return (
    <svg className="hero-rope" viewBox="-40 -190 560 380" aria-hidden="true" focusable="false">
      <g transform="rotate(-12 240 0)">
        {CORES.map((cx) => (
          <path
            key={`b${cx}`}
            d={ring(cx, 0)}
            fill="none"
            stroke="var(--core)"
            strokeWidth="17"
            strokeLinecap="round"
            opacity="0.45"
          />
        ))}
        {OFFSETS.map((_, w) => {
          const d = wire(w);
          return (
            <g key={d}>
              <path
                d={d}
                fill="none"
                stroke="var(--page)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={d}
                fill="none"
                stroke="var(--accent-mark)"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95 - w * 0.12}
              />
              <path
                d={d}
                className="pulse"
                pathLength={1000}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.6"
                strokeLinecap="round"
                style={{ animationDelay: `${w * 1.1}s` }}
              />
            </g>
          );
        })}
        {CORES.map((cx) => (
          <path
            key={`f${cx}`}
            d={ring(cx, 1)}
            fill="none"
            stroke="var(--core)"
            strokeWidth="17"
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}
