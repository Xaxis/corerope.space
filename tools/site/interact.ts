// Drives the site's interactive parts in Chromium and checks what a reader would see: the 3D stages,
// the scrolling story, the Amdahl control, the cost model's sliders, presets and shareable URL, the
// lever budget's tabs, chart tooltips, the old addresses' redirects, the theme switch and the phone
// menu. Run it on a local server or the live site.
//
//   ~/.claude/claude-core/bin/heavy node tools/site/interact.ts --url URL
//
// Prints one line per check and exits 1 if any fails. Chromium stays on SwiftShader.
import { parseArgs } from "node:util";
import { chromium, type Page } from "playwright-core";
import { CHROMIUM_ARGS } from "../lib/chromium.ts";

const { values } = parseArgs({ options: { url: { type: "string" } } });
if (values.url === undefined) {
  console.error("usage: node tools/site/interact.ts --url URL");
  process.exit(2);
}
const base = values.url.replace(/\/$/, "");
const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures.push(name);
}
const tile = async (page: Page, label: string) =>
  (
    (await page
      .locator(".calc-tile", { hasText: label })
      .locator(".calc-tile-value")
      .textContent()) ?? ""
  ).trim();

const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // The cost model: presets, a slider, the Amdahl cap and the URL that carries them.
  await page.goto(`${base}/cost-model`, { waitUntil: "networkidle" });
  check(
    "calculator opens on the central fabric case",
    (await tile(page, "Less energy per solved task")) === "749x",
    await tile(page, "Less energy per solved task"),
  );
  check(
    "dollars per task, central",
    (await tile(page, "Lower cost per solved task")) === "263x",
    await tile(page, "Lower cost per solved task"),
  );
  await page.locator("#p-gpu_share").fill("0");
  await page.waitForTimeout(150);
  check(
    "no GPU fallback gives 1,196x energy per task",
    (await tile(page, "Less energy per solved task")) === "1,196x",
    await tile(page, "Less energy per solved task"),
  );
  check(
    "the Amdahl cap says nothing caps the gain",
    ((await page.locator(".calc-cap").textContent()) ?? "").includes("nothing caps"),
  );
  check("the URL carries the change", page.url().includes("gpu_share=0"), page.url());
  await page.getByRole("button", { name: "Pessimistic" }).click();
  await page.waitForTimeout(150);
  check(
    "the pessimistic preset gives 15x",
    (await tile(page, "Less energy per solved task")) === "15x",
    await tile(page, "Less energy per solved task"),
  );
  await page.goto(`${base}/cost-model?case=optimistic`, { waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check(
    "a shared link opens its case (optimistic: 46,009x)",
    (await tile(page, "Less energy per solved task")) === "46,009x",
    await tile(page, "Less energy per solved task"),
  );
  await page.goto(`${base}/cost-model?scenario=as_written`, { waitUntil: "networkidle" });
  await page.waitForTimeout(150);
  check(
    "the new-chip scenario gives 89x dollars per task, as recorded",
    (await tile(page, "Lower cost per solved task")) === "89x",
    await tile(page, "Lower cost per solved task"),
  );

  // The Amdahl control beside the fleet scene: 1% on GPUs leaves 92x, as recorded.
  await page.goto(`${base}/cost-model#amdahl`, { waitUntil: "networkidle" });
  const control = page.locator(".amdahl-stage .amdahl");
  await control.locator("label", { hasText: /^1%$/ }).click();
  const gain = ((await control.locator(".amdahl-out dd").first().textContent()) ?? "").trim();
  check("the Amdahl control at 1% on GPUs shows 92x", gain === "92x", gain);
  await control.locator("label", { hasText: /^0%$/ }).click();
  const ceiling = ((await control.locator(".amdahl-out dd").nth(1).textContent()) ?? "").trim();
  check("with nothing on GPUs there is no ceiling", ceiling === "none", ceiling);

  // The lever budget's tabs, now in the survey; the old address lands on its chapter.
  await page.goto(`${base}/levers`, { waitUntil: "networkidle" });
  check(
    "the old /levers address lands on the survey",
    page.url() === `${base}/survey#levers`,
    page.url(),
  );
  const b24 = page.getByRole("tab", { name: /Against B2024/ });
  await b24.click();
  const panel = page.getByRole("tabpanel").filter({ hasText: "Capability density" });
  check("the B2024 tab shows Table A's levers", await panel.isVisible());

  // The hero's 3D stage draws, and its pause button works.
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  const hero = page.locator(".hero3d .stage");
  await page
    .waitForFunction(
      () => document.querySelector(".hero3d .stage")?.getAttribute("data-status") !== "idle",
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  check(
    "the hero's WebGL stage is drawing",
    (await hero.getAttribute("data-status")) === "ready" &&
      (await hero.locator("canvas").count()) === 1,
    `${await hero.getAttribute("data-status")}`,
  );
  const pause = hero.getByRole("button", { name: "Pause the animation" });
  await pause.click();
  check(
    "the pause button stops the animation",
    (await hero
      .getByRole("button", { name: "Play the animation" })
      .getAttribute("aria-pressed")) === "true",
  );

  // The story: scrolling a step to the middle of the screen makes it the active one.
  const step = page.locator('#today .story-step[data-step="1"]');
  await step.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page
    .waitForFunction(
      () =>
        document.querySelector('#today .story-step[data-step="1"]')?.getAttribute("data-on") ===
        "true",
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  check("scrolling the story activates its step", (await step.getAttribute("data-on")) === "true");
  const stage1 = page.locator("#today .stage");
  await page
    .waitForFunction(
      () => document.querySelector("#today .stage")?.getAttribute("data-status") !== "idle",
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  check(
    "the story's stage loads when it comes into view",
    (await stage1.getAttribute("data-status")) === "ready",
    `${await stage1.getAttribute("data-status")}`,
  );

  // A tooltip on a chart mark.
  await page.locator('[data-tip-title="Energy per task, per solved task"]').hover();
  const tip = page.locator(".tip");
  check(
    "hovering a chart row shows its tooltip",
    (await tip.count()) === 1 && ((await tip.textContent()) ?? "").includes("749x"),
    (await tip.count()) ? ((await tip.textContent()) ?? "") : "none",
  );

  // The theme switch, remembered across a reload.
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Switch between light and dark" }).click();
  check(
    "the theme switch turns the page dark",
    (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark",
  );
  await page.reload({ waitUntil: "networkidle" });
  check(
    "the choice survives a reload",
    (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark",
  );
  await page.evaluate(() => localStorage.removeItem("theme"));

  // Reduced motion: the stage draws one still frame and offers no pause button.
  const calm = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await calm.goto(`${base}/`, { waitUntil: "networkidle" });
  await calm
    .waitForFunction(
      () => document.querySelector(".hero3d .stage")?.getAttribute("data-status") !== "idle",
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  check(
    "with reduced motion the hero is a still frame",
    (await calm.locator(".hero3d .stage").getAttribute("data-status")) === "ready" &&
      (await calm.locator(".hero3d .stage-pause").count()) === 0,
  );
  await calm.close();

  // The phone menu.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${base}/`, { waitUntil: "networkidle" });
  // On a phone the stage sits on top; a step held just under it, where it can be read, is active.
  const held = phone.locator('#wires .story-step[data-step="1"]');
  await held.evaluate((el) =>
    window.scrollBy(0, el.getBoundingClientRect().top - window.innerHeight * 0.58),
  );
  await phone
    .waitForFunction(
      () =>
        document.querySelector('#wires .story-step[data-step="1"]')?.getAttribute("data-on") ===
        "true",
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  const stageBottom = await phone
    .locator("#wires .story-stage-col")
    .evaluate((el) => el.getBoundingClientRect().bottom);
  const stepTop = await held.evaluate((el) => el.getBoundingClientRect().top);
  check(
    "on a phone the step being read, under the stage, is the active one",
    (await held.getAttribute("data-on")) === "true" && stepTop >= stageBottom,
    `step top ${Math.round(stepTop)}, stage bottom ${Math.round(stageBottom)}`,
  );
  await phone.evaluate(() => window.scrollTo(0, 0));
  await phone.getByRole("button", { name: "Open the menu" }).click();
  const menu = phone.locator("#mobile-nav");
  check("the phone menu opens", await menu.isVisible());
  await menu.getByRole("link", { name: "Experiments" }).click();
  await phone.waitForURL(`${base}/experiments`);
  await menu.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  check("a menu link navigates and the menu closes", !(await menu.isVisible()));
} finally {
  await browser.close();
}
console.log(
  failures.length === 0 ? "interact: all checks pass" : `interact: ${failures.length} failed`,
);
process.exit(failures.length === 0 ? 0 : 1);
