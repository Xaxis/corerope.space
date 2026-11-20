// From paperwright.diy tools/lib/axe.ts @ 352b780 blob 5c6fce6953b5.
// What axe-core finds on a page against WCAG 2.2 A and AA, for the tour and the site's shots: each
// rule broken, how badly, and a few of the elements that break it.
import { join, resolve } from "node:path";
import type { Page } from "playwright-core";

const AXE = join(resolve(import.meta.dirname, "../.."), "node_modules/axe-core/axe.min.js");

export interface Violation {
  id: string;
  /** "minor", "moderate", "serious" or "critical". */
  impact: string;
  help: string;
  targets: string[];
}

/** Serious and critical: what a check fails on. */
export const fails = (v: Violation) => v.impact === "serious" || v.impact === "critical";

export async function axeViolations(page: Page): Promise<Violation[]> {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    type Result = {
      violations: Array<{
        id: string;
        impact: string | null;
        help: string;
        nodes: Array<{ target: string[] }>;
      }>;
    };
    const w = window as unknown as { axe: { run: (on: Document, o: unknown) => Promise<Result> } };
    const r = await w.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      resultTypes: ["violations"],
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? "minor",
      help: v.help,
      targets: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
    }));
  });
}
