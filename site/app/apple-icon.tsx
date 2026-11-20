import { ImageResponse } from "next/og";

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
    </div>,
    size,
  );
}
