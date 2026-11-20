// From paperwright.diy tools/lib/chromium.ts @ 352b780 blob 1da545c48b31.
// How every browser run here launches Chromium: on SwiftShader, never the box's GPU, which other
// projects' renders hold (CLAUDE.md, "Share the box"). From Cutwright tools/studio-web/boot.ts.
export const CHROMIUM_ARGS = ["--use-angle=swiftshader", "--disable-gpu-watchdog"];

/** Shows [page] light or dark, once its colours have settled: a button's background eases over
 * 120 ms, and a shot taken sooner catches it halfway. */
export async function showScheme(
  page: {
    emulateMedia(o: { colorScheme: "light" | "dark" }): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
  },
  scheme: "light" | "dark",
): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme });
  await page.waitForTimeout(300);
}
