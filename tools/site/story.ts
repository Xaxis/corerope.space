// What a reader sees while scrolling a story page: the viewport at load (the hero), then with each
// story step held where a reader reads it, so its 3D stage has moved to that step. Element
// screenshots of a tall sticky section wait for the stage to hold still, which a slow WebGL frame
// rate under SwiftShader can make time out; viewport captures do not.
//
//   ~/.claude/claude-core/bin/heavy node tools/site/story.ts --url URL [--path /] [--width 1440]
//     [--height 900] [--wait 3500] [--scheme light|dark] [--out DIR]
//
// Writes <page>-<width>-hero.png and <page>-<width>-step<N>.png. Chromium stays on SwiftShader.
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { CHROMIUM_ARGS } from "../lib/chromium.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    path: { type: "string", default: "/" },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    wait: { type: "string", default: "3500" },
    scheme: { type: "string", default: "light" },
    out: { type: "string" },
  },
});
if (values.url === undefined) {
  console.error(
    "usage: node tools/site/story.ts --url URL [--path /] [--width 1440] [--height 900]",
  );
  process.exit(2);
}
const out = resolve(values.out ?? join(import.meta.dirname, "../../out/story"));
mkdirSync(out, { recursive: true });
const width = Number(values.width);
const wait = Number(values.wait);
const name = values.path === "/" ? "home" : values.path.slice(1).replace(/\//g, "-");

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
try {
  const page = await browser.newPage({
    viewport: { width, height: Number(values.height) },
    colorScheme: values.scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`${values.url.replace(/\/$/, "")}${values.path}`, {
    waitUntil: "load",
    timeout: 180_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);
  const hero = join(out, `${name}-${width}-hero.png`);
  await page.screenshot({ path: hero });
  console.log(hero);
  for (const [i, step] of (await page.locator(".story-step").all()).entries()) {
    // Where a reader holds a step to read it: mid-screen beside the stage, or just under the stage
    // on a narrow screen (site/components/Story.tsx picks the active step the same way).
    await step.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const at =
        window.innerWidth <= 900 ? window.innerHeight * 0.58 : (window.innerHeight - r.height) / 2;
      window.scrollBy(0, r.top - at);
    });
    await page.waitForTimeout(wait);
    const file = join(out, `${name}-${width}-step${i}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
} finally {
  await browser.close();
}
