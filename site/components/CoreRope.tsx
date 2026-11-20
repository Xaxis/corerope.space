// The name, drawn. Left: core rope memory, where a sense wire threaded through a ferrite core reads
// a 1 and a wire routed around it reads a 0, so the program is woven in. Right: a wired-weight
// layer, where each input is wired to an adder's plus input (+1), its minus input (-1), or nothing
// (0). The weights are the design doc's own example: x1 minus x3 plus x4.

const CORES = [110, 220, 330, 440, 550];
const CY = 128;
const WIRES = [CY - 18, CY, CY + 18];
// BITS[core][wire]: 1 threads the core, 0 goes around it.
const BITS = [
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 0],
  [0, 0, 1],
  [1, 1, 1],
];
// Where each wire detours when it bypasses a core: above for the top wire, below for the others.
const DETOUR = [CY - 66, CY + 66, CY + 80];

function wirePath(w: number): string {
  const y = WIRES[w] as number;
  let d = `M 30 ${y}`;
  for (const [c, cx] of CORES.entries()) {
    if (BITS[c]?.[w]) {
      d += ` L ${cx + 48} ${y}`;
    } else {
      const yd = DETOUR[w] as number;
      d += ` L ${cx - 54} ${y} C ${cx - 30} ${y} ${cx - 34} ${yd} ${cx} ${yd} C ${cx + 34} ${yd} ${cx + 30} ${y} ${cx + 54} ${y}`;
    }
  }
  return `${d} L 630 ${y}`;
}

function Ring({ cx, half }: { cx: number; half: "back" | "front" }) {
  // A ferrite ring seen almost edge-on: the wire runs through its hole.
  const rx = 17;
  const ry = 44;
  const sweep = half === "back" ? 0 : 1;
  return (
    <path
      d={`M ${cx} ${CY - ry} A ${rx} ${ry} 0 0 ${sweep} ${cx} ${CY + ry}`}
      fill="none"
      stroke="var(--core)"
      strokeWidth="11"
      strokeLinecap="round"
      opacity={half === "back" ? 0.55 : 1}
    />
  );
}

export function CoreRope() {
  const wires = [0, 1, 2].map(wirePath);
  return (
    <figure className="corerope-fig">
      <div className="corerope-panels">
        <div className="corerope-panel">
          <svg viewBox="0 0 660 250" role="img" aria-labelledby="cr-a-title cr-a-desc">
            <title id="cr-a-title">Core rope memory</title>
            <desc id="cr-a-desc">
              Five ring cores in a row and three wires. Each wire either threads through a core,
              which stores a 1, or bends around it, which stores a 0. The bits under each core read
              101, 011, 110, 001 and 111.
            </desc>
            {CORES.map((cx) => (
              <Ring key={`b${cx}`} cx={cx} half="back" />
            ))}
            {wires.map((d, i) => (
              <g key={d}>
                <path
                  d={d}
                  fill="none"
                  stroke="var(--surface)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill="none"
                  stroke="var(--accent-mark)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={1 - i * 0.18}
                />
                <path
                  d={d}
                  className="pulse"
                  pathLength={1000}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  style={{ animationDelay: `${i * 0.9}s` }}
                />
              </g>
            ))}
            {CORES.map((cx) => (
              <Ring key={`f${cx}`} cx={cx} half="front" />
            ))}
            {CORES.map((cx, c) => (
              <text key={`t${cx}`} x={cx} y="238" textAnchor="middle" className="cr-bits">
                {(BITS[c] ?? []).join("")}
              </text>
            ))}
          </svg>
          <p className="corerope-cap">
            <b>Core rope memory.</b> A wire threaded through a core is a 1; a wire passing around it
            is a 0. The Apollo Guidance Computer's software was woven in this way, so it could not
            change.
          </p>
        </div>
        <div className="corerope-panel">
          <svg viewBox="0 0 660 250" role="img" aria-labelledby="cr-b-title cr-b-desc">
            <title id="cr-b-title">A wired weight</title>
            <desc id="cr-b-desc">
              Four inputs, x1 to x4, and an adder with a plus and a minus input. x1 is wired to
              plus, x2 to nothing, x3 to minus and x4 to plus, so the output is x1 minus x3 plus x4.
            </desc>
            {[
              { y: 52, label: "x1", w: "+1", to: "plus" },
              { y: 102, label: "x2", w: "0", to: "none" },
              { y: 152, label: "x3", w: "−1", to: "minus" },
              { y: 202, label: "x4", w: "+1", to: "plus" },
            ].map((x) => {
              const ty = x.to === "plus" ? 108 : 148;
              const d =
                x.to === "none"
                  ? `M 70 ${x.y} L 250 ${x.y}`
                  : `M 70 ${x.y} L 250 ${x.y} C 340 ${x.y} 360 ${ty} 448 ${ty}`;
              return (
                <g key={x.label}>
                  <text x="44" y={x.y} dy="0.35em" textAnchor="end" className="cr-in">
                    {x.label}
                  </text>
                  <circle cx="62" cy={x.y} r="4" fill="var(--ink-2)" />
                  <path
                    d={d}
                    fill="none"
                    stroke={x.to === "none" ? "var(--neutral-mark)" : "var(--accent-mark)"}
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeDasharray={x.to === "none" ? "2 5" : undefined}
                  />
                  {x.to === "none" && (
                    <circle
                      cx="256"
                      cy={x.y}
                      r="4.5"
                      fill="var(--surface)"
                      stroke="var(--neutral-mark)"
                      strokeWidth="2"
                    />
                  )}
                  <text x="160" y={x.y} dy="-10" textAnchor="middle" className="cr-w">
                    {x.w}
                  </text>
                </g>
              );
            })}
            <circle
              cx="500"
              cy="128"
              r="52"
              fill="var(--surface)"
              stroke="var(--core)"
              strokeWidth="2.5"
            />
            <text x="500" y="128" dy="0.36em" textAnchor="middle" className="cr-sigma">
              {"Σ"}
            </text>
            <text x="462" y="108" dy="0.35em" textAnchor="middle" className="cr-port">
              +
            </text>
            <text x="462" y="148" dy="0.35em" textAnchor="middle" className="cr-port">
              {"−"}
            </text>
            <path d="M 552 128 L 610 128" stroke="var(--ink-2)" strokeWidth="2" />
            <path d="M 610 122 L 620 128 L 610 134 Z" fill="var(--ink-2)" />
            <text x="500" y="228" textAnchor="middle" className="cr-eq">
              {"x1 − x3 + x4"}
            </text>
          </svg>
          <p className="corerope-cap">
            <b>A wired weight.</b> Each input is wired to an adder's plus input (+1), its minus
            input ({"−"}1), or nothing (0). No weight is stored, so none is ever fetched, and no
            multiplier exists.
          </p>
        </div>
      </div>
    </figure>
  );
}
