// Every step of every stepped 3D scene on a page: scrolls each `.stage-steps` into view, chooses
// each step in its picker, waits for the camera to settle, and photographs the stage. Also prints
// how many stages hold a live WebGL canvas at each point, which shows far-off stages are released.
//
//   ~/.claude/claude-core/bin/heavy node tools/site/scenes.ts --url URL --path /design \
//     [--width 1440] [--scheme dark] [--wait 3500] [--only 2] [--out DIR]
//
// --only N photographs just the Nth stepped scene (0-based). Viewport captures with a clip, not
// element screenshots: on SwiftShader a running scene keeps an element "unstable" for too long.
// Exit 1 if a stage fails to start. Chromium stays on SwiftShader (CHROMIUM_ARGS).
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { CHROMIUM_ARGS } from "../lib/chromium.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    path: { type: "string", default: "/design" },
    scheme: { type: "string", default: "light" },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    wait: { type: "string", default: "3500" },
    only: { type: "string" },
    out: { type: "string" },
  },
});
if (values.url === undefined) {
  console.error("usage: node tools/site/scenes.ts --url URL [--path /design]");
  process.exit(2);
}
const out = resolve(values.out ?? join(import.meta.dirname, "../../out/scenes"));
mkdirSync(out, { recursive: true });
const wait = Number(values.wait);
const width = Number(values.width);
const name = values.path === "/" ? "home" : values.path.slice(1).replace(/\//g, "-");
let failed = 0;
const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
try {
  const page = await browser.newPage({
    viewport: { width, height: Number(values.height) },
    colorScheme: values.scheme === "dark" ? "dark" : "light",
  });
  page.on("pageerror", (e) => console.log(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`console error: ${m.text()}`);
  });
  await page.goto(`${values.url.replace(/\/$/, "")}${values.path}`, {
    waitUntil: "load",
    timeout: 180_000,
  });
  await page.evaluate(() => document.fonts.ready);
  const live = () => page.locator(".stage-gl canvas").count();
  const groups = await page.locator(".stage-steps").all();
  console.log(`${groups.length} stepped scenes; live canvases at the top: ${await live()}`);
  for (const [g, group] of groups.entries()) {
    if (values.only !== undefined && Number(values.only) !== g) continue;
    const stage = group.locator(".stage").first();
    const labels = await group.locator(".seg label").all();
    // Centre the stage, so the whole of it is in the viewport.
    await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
    try {
      await stage.locator("canvas").waitFor({ state: "attached", timeout: 60_000 });
    } catch {
      console.log(`scene ${g}: no canvas (status ${await stage.getAttribute("data-status")})`);
      failed++;
      continue;
    }
    const scene = await group.locator("legend").evaluate((el) => {
      const id = el.closest("section")?.id ?? "";
      return id;
    });
    for (const [i, label] of labels.entries()) {
      await label.click();
      await page.waitForTimeout(wait);
      await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
      const box = await stage.boundingBox();
      if (!box) continue;
      const file = join(out, `${name}-${scene || g}-step${i}-${values.scheme}-${width}.png`);
      await page.screenshot({ path: file, clip: box });
      const status = await stage.getAttribute("data-status");
      const title = ((await label.textContent()) ?? "").replace(/^\d+/, "").trim();
      console.log(`${file}  ${status}  "${title}"`);
      if (status !== "ready") failed++;
    }
    console.log(`  live canvases now: ${await live()}`);
  }
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
