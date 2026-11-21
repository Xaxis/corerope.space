// From paperwright.diy tools/lib/chromium.ts @ 352b780 blob 1da545c48b31.
// How every browser run here launches Chromium: on SwiftShader, never the box's GPU, which other
// projects' renders hold (CLAUDE.md, "Share the box"). From Cutwright tools/studio-web/boot.ts.
export const CHROMIUM_ARGS = ["--use-angle=swiftshader", "--disable-gpu-watchdog"];
