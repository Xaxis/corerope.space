// A closer look at parts of one page: screenshots of every element matching a selector, for checking
// a chart or a section without reading a whole page's shots.
//
//   ~/.claude/claude-core/bin/heavy node tools/site/peek.ts --url URL --path /survey \
//     --selector ".fig" [--scheme light|dark] [--width 1440] [--wait MS] [--out DIR]
//
// --wait gives each element time after it scrolls into view: 3D stages load and draw lazily.
//
// Prints the files it wrote. Chromium stays on SwiftShader (CHROMIUM_ARGS).
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import { CHROMIUM_ARGS } from "../lib/chromium.ts";

const { values } = parseArgs({
  options: {
    url: { type: "string" },
    path: { type: "string", default: "/" },
    selector: { type: "string", default: ".fig" },
    scheme: { type: "string", default: "light" },
    width: { type: "string", default: "1440" },
    wait: { type: "string", default: "0" },
    out: { type: "string" },
  },
});
if (values.url === undefined) {
  console.error("usage: node tools/site/peek.ts --url URL --path P --selector S");
  process.exit(2);
}
const out = resolve(values.out ?? join(import.meta.dirname, "../../out/peek"));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
try {
  const page = await browser.newPage({
    viewport: { width: Number(values.width), height: 900 },
    colorScheme: values.scheme === "dark" ? "dark" : "light",
  });
  await page.goto(`${values.url.replace(/\/$/, "")}${values.path}`, {
    waitUntil: "load",
    timeout: 180_000,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  const els = await page.locator(values.selector).all();
  const name = (values.path === "/" ? "home" : values.path.slice(1).replace(/\//g, "-")) || "home";
  for (const [i, el] of els.entries()) {
    const file = join(out, `${name}-${i}-${values.scheme}-${values.width}.png`);
    await el.scrollIntoViewIfNeeded();
    if (Number(values.wait) > 0) await page.waitForTimeout(Number(values.wait));
    await el.screenshot({ path: file, animations: "allow" });
    console.log(file);
  }
} finally {
  await browser.close();
}
