import { ImageResponse } from "next/og";
import { LOGO } from "@/components/Logo";

// The home-screen icon: iOS does not use SVG icons, so the mark is drawn into a PNG.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6f4ef",
      }}
    >
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: drawn into a PNG, never part of a page */}
      <svg width="132" height="132" viewBox="0 0 32 32">
        <path
          d={LOGO.back}
          fill="none"
          stroke="#2b2926"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.6"
        />
        <path d={LOGO.wire} fill="none" stroke="#d4581f" strokeWidth="2.6" strokeLinecap="round" />
        <path d={LOGO.front} fill="none" stroke="#2b2926" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>,
    size,
  );
}
