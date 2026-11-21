import { ImageResponse } from "next/og";
import { LOGO } from "@/components/Logo";
import { multipliers } from "@/lib/data";
import { times } from "@/lib/scale";

export const alt = "Corerope: making a frontier-quality LLM roughly 1000x cheaper to run";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function OpenGraphImage() {
  const et = multipliers.rows.find((r) => r.key === "energy_task");
  const dt = multipliers.rows.find((r) => r.key === "dollars_task");
  const cores = [0, 1, 2, 3, 4];
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f4ef",
        color: "#141311",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 700 }}
      >
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: drawn into a PNG, never part of a page */}
        <svg width="44" height="44" viewBox="0 0 32 32">
          <path
            d={LOGO.back}
            fill="none"
            stroke="#2b2926"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d={LOGO.wire}
            fill="none"
            stroke="#d4581f"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path d={LOGO.front} fill="none" stroke="#2b2926" strokeWidth="4" strokeLinecap="round" />
        </svg>
        Corerope
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Two set lines: the renderer misplaces word spacing around a hyphen it may break at. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
          }}
        >
          <div>Making a frontier-quality LLM</div>
          <div>roughly 1000x cheaper to run</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 28, color: "#4a4740" }}>
          <div>{`Design, central case: ${et ? times(et.central) : ""} less energy and ${dt ? times(dt.central) : ""} lower cost per task.`}</div>
          <div style={{ color: "#a6441a" }}>Not yet proven.</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        {/* Five cores with the wire threaded through them, as in the logo. */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, position: "relative" }}>
          {cores.map((c) => (
            <div
              key={c}
              style={{ width: 26, height: 64, borderRadius: 40, border: "9px solid #2b2926" }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              left: -24,
              right: -24,
              top: 30,
              height: 5,
              borderRadius: 3,
              background: "#d4581f",
            }}
          />
        </div>
        <div style={{ marginLeft: "auto", fontSize: 26, color: "#a6441a", fontWeight: 600 }}>
          corerope.space
        </div>
      </div>
    </div>,
    size,
  );
}
