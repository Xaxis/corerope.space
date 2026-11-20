import { ImageResponse } from "next/og";
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
            d="M16 5.5 A5.2 10.5 0 0 0 16 26.5"
            fill="none"
            stroke="#2b2926"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.6"
          />
          <path
            d="M2 18.5 C 8 18.5, 10 16, 16 16 S 24 13.5, 30 13.5"
            fill="none"
            stroke="#d4581f"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M16 5.5 A5.2 10.5 0 0 1 16 26.5"
            fill="none"
            stroke="#2b2926"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        Corerope
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div
          style={{
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
            maxWidth: 940,
          }}
        >
          Making a frontier-quality LLM roughly 1000x cheaper to run
        </div>
        <div style={{ fontSize: 28, color: "#4a4740", display: "flex" }}>
          {`Design, central case: ${et ? times(et.central) : ""} less energy and ${dt ? times(dt.central) : ""} lower cost per task. Not yet proven.`}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        {cores.map((c) => (
          <div
            key={c}
            style={{ width: 26, height: 64, borderRadius: 40, border: "9px solid #2b2926" }}
          />
        ))}
        <div style={{ marginLeft: "auto", fontSize: 26, color: "#a6441a", fontWeight: 600 }}>
          corerope.space
        </div>
      </div>
    </div>,
    size,
  );
}
