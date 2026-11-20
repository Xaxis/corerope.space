// From paperwright.diy tools/site/shots.ts @ 352b780 blob f6072dc66191 (itself from Cutwright);
// adapted: corerope.space's pages, and a page's charts must render. Shots of the site's pages to look at, and what a page must pass on a phone
// (tools/site/deploy.sh runs it on the live site; run it on a local server before a deploy): each
// page answering 200 (or 404 for the missing page), shot whole at 1440 and at 390 px wide, light
// and dark. At neither width may anything scroll sideways: the page is no wider than the window,
// and at 390 px every block keeps a side gutter. Each is
// checked by axe against WCAG 2.2 A and AA, and a serious or critical finding fails it.
//
//   ~/.claude/claude-core/bin/heavy node tools/site/shots.ts --url URL [--out DIR] [--only /a,/b]
//
// Chromium stays on SwiftShader (CHROMIUM_ARGS). Prints JSON last: each page, its status, its
// width at 390 px and its shots. Exits 1 when a page answers wrongly or scrolls sideways.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { axeViolations, fails } from "../lib/axe.ts";
import { CHROMIUM_ARGS } from "../lib/chromium.ts";
import { touchingEdges } from "../lib/gutter.ts";

const { values } = parseArgs({
  options: { url: { type: "string" }, out: { type: "string" }, only: { type: "string" } },
});
const root = resolve(import.meta.dirname, "../..");
const out = resolve(values.out ?? join(root, "out/site-shots"));
mkdirSync(out, { recursive: true });
if (values.url === undefined) {
  console.error("usage: node tools/site/shots.ts --url URL [--out DIR]");
  process.exit(2);
}
const base = values.url.replace(/\/$/, "");

/** The site's public pages, with the status each must answer. */
export const PAGES: Array<[string, number]> = [
  ["/", 200],
  ["/survey", 200],
  ["/design", 200],
  ["/cost-model", 200],
  ["/experiments", 200],
  ["/research", 200],
  ["/research/path-to-1000x", 200],
  ["/research/corerope-design", 200],
  ["/research/hardware-systems", 200],
  ["/research/results", 200],
  ["/no-such-page", 404],
];

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
const pages: { path: string; status: number; widthAt390: number; shots: string[] }[] = [];
const problems: string[] = [];
try {
  // --only /a,/b: just those pages, for a quick look while working.
  const only = values.only?.split(",");
  for (const [path, want] of PAGES.filter(([p]) => !only || only.includes(p))) {
    const name = path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
    const shots: string[] = [];
    let status = 0;
    let widthAt390 = 0;
    for (const [label, width, height] of [
      ["desktop", 1440, 900],
      ["mobile", 390, 844],
    ] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const context = await browser.newContext({
          viewport: { width, height },
          colorScheme: scheme,
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        // Anything the Content-Security-Policy refused (site/next.config.ts).
        page.on("console", (m) => {
          if (m.type() === "error" && /Content Security Policy/i.test(m.text()))
            problems.push(`${path} ${label} ${scheme}: ${m.text().slice(0, 300)}`);
        });
        const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
        status = response?.status() ?? 0;
        await page.evaluate(() => document.fonts.ready);
        // At any width the page is no wider than the window (a wide table once pushed /design
        // sideways at 1440 px while 390 px was fine).
        const [wide, window_] = await page.evaluate(() => [
          document.documentElement.scrollWidth,
          document.documentElement.clientWidth,
        ]);
        if (width !== 390 && (wide ?? 0) > (window_ ?? width))
          problems.push(`${path} ${label} ${scheme} scrolls sideways (${wide} px in ${window_})`);
        if (width === 390) {
          widthAt390 = Math.max(
            widthAt390,
            await page.evaluate(() => document.documentElement.scrollWidth),
          );
          const touching = await page.evaluate(touchingEdges);
          if (touching.length > 0)
            problems.push(`${path} at 390 px has no side gutter for ${touching.join(", ")}`);
        }
        // As a reader sees it after scrolling: every lazy picture loaded, no colour mid-change.
        await page.addStyleTag({
          content:
            "*, *::before, *::after { transition: none !important; animation: none !important; }",
        });
        await page.evaluate(async () => {
          const images = [...document.images];
          for (const img of images) img.loading = "eager";
          await Promise.all(
            images.map((img) =>
              img.complete
                ? null
                : new Promise((done) => {
                    img.onload = done;
                    img.onerror = done;
                  }),
            ),
          );
        });
        for (const v of (await axeViolations(page)).filter(fails))
          problems.push(`${path} ${label} ${scheme}: axe ${v.id} at ${v.targets.join(", ")}`);
        const file = join(out, `${name}-${label}-${scheme}.png`);
        await page.screenshot({ path: file, fullPage: true });
        shots.push(file);
        await context.close();
      }
    }
    if (status !== want) problems.push(`${path} answered ${status}, not ${want}`);
    if (widthAt390 > 390)
      problems.push(`${path} scrolls sideways at 390 px (it is ${widthAt390} px wide)`);
    pages.push({ path, status, widthAt390, shots });
  }
} finally {
  await browser.close();
}
for (const p of problems) console.error(`shots: ${p}`);
console.log(JSON.stringify({ ok: problems.length === 0, base, out, pages }));
process.exit(problems.length === 0 ? 0 : 1);
