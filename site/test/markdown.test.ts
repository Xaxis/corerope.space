// The research renderer: what it adds to the text as written (superscripts, evidence chips, lines
// that must not break, the design's figure specifications, table sizing), and that it changes no
// words.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { Markdown } from "@/components/Markdown";

/** The HTML the site serves for a snippet of research Markdown. */
const render = (md: string) =>
  renderToStaticMarkup(
    createElement(Markdown, {
      nodes: unified().use(remarkParse).use(remarkGfm).parse(md).children,
    }),
  );
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

describe("research renderer", () => {
  it("sets a caret power as a superscript, whatever its base and exponent", () => {
    const html = render(
      "Loss is 0.19·C^0.5095, energy 3 x 10^16 and N(1 - e^(-P_w/gamma_w)), R^2.",
    );
    expect(html).toContain("C<sup>0.5095</sup>");
    expect(html).toContain("10<sup>16</sup>");
    expect(html).toContain("e<sup>(-P_w/gamma_w)</sup>");
    expect(html).toContain("R<sup>2</sup>");
    // "3 x 10^16" stays on one line.
    expect(html).toContain("3\u00a0x\u00a010<sup>");
  });

  it("chips the evidence labels, drops their brackets inside the pill, and lets a long one wrap", () => {
    const html = render(
      "A claim (vendor claim) (arXiv Nov 2024, so older) [SECONDARY, blog recap citing third-party timelines].",
    );
    expect(html).toMatch(/<span class="ev ev-vendor"[^>]*>vendor claim<\/span>/);
    // Only "older" is the label; "so" stays text.
    expect(html).toMatch(/so <span class="ev ev-older"[^>]*>older<\/span>\)/);
    expect(html).toMatch(/class="ev ev-secondary ev-long"[^>]*>SECONDARY, blog/);
  });

  it("keeps ranges, hyphenated names with numbers, flags and units on one line", () => {
    const html = render(
      "gpt-oss-120b scores 55-82% at 815 mm2 and 4.25 bits/param; run -noabc; A -> B; A ≈ 0.0048.",
    );
    for (const token of [
      "gpt-oss-120b",
      "55-82%",
      "815 mm2",
      "4.25 bits/param",
      "-noabc",
      "-&gt;",
      "≈ 0.0048",
    ])
      expect(html).toContain(`<span class="nowrap">${token}</span>`);
  });

  it("changes no words", () => {
    const md = "Range 2.45-11.53 [older], 10^6 tokens -> gpt-oss-120b at 5 GB.";
    // The pills drop the brackets and the caret becomes a superscript; every word stays.
    expect(text(render(md))).toBe("Range 2.45-11.53 older, 106 tokens -> gpt-oss-120b at 5 GB.");
  });

  it("boxes a figure specification and links to where the site draws it", () => {
    const html = render('[Diagram: "Every task stays on wired silicon". Flow: A -> B.]');
    expect(html).toContain('class="figure-spec"');
    expect(html).toContain('href="/design#two-tier-fleet"');
    expect(html).toContain("Every task stays on wired silicon");
    // The specification as written is kept, folded.
    expect(html).toMatch(/<details>.*Flow: A/s);
  });

  it("sizes tables: a first column of short words is narrow, long cells get a reading width", () => {
    const long = "a cell with a long explanation that runs well past sixty characters in all";
    const html = render(`| # | Bet |\n|---|---|\n| 1 | ${long} |\n| Dropped | short |`);
    expect(html).toContain('class="table-wrap narrow-first"');
    expect(render("| Part | Why |\n|---|---|\n| Static memory | a |")).not.toContain(
      "narrow-first",
    );
    expect(html).toContain(`<td class="long">${long}</td>`);
    expect(html).not.toContain('<td class="long">short');
  });
});
