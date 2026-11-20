// The source index: every cited link once, under its own site, named as specifically as the research
// names it, with every line that cites it and no line twice.
import { describe, expect, it } from "vitest";
import { citations, DOCS } from "@/lib/content";
import { sourceSites } from "@/lib/sources";

const sites = sourceSites();
const links = sites.flatMap((s) => s.links.map((l) => ({ ...l, host: s.host })));
const all = DOCS.flatMap((d) => citations(d.file).map((c) => ({ ...c, slug: d.slug })));

describe("source index", () => {
  it("lists every cited URL exactly once", () => {
    expect(links.map((l) => l.url).sort()).toEqual([...new Set(all.map((c) => c.url))].sort());
  });

  it("puts each link under its own site, sites in order", () => {
    for (const s of sites)
      for (const l of s.links) expect(new URL(l.url).hostname.replace(/^www\./, "")).toBe(s.host);
    expect(sites.map((s) => s.host)).toEqual(
      [...sites.map((s) => s.host)].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("keeps every citing line, once, under the document that has it", () => {
    const want = new Set(all.map((c) => `${c.url} ${c.slug}:${c.line}`));
    const got = links.flatMap((l) =>
      l.where.flatMap((w) => w.lines.map((n) => `${l.url} ${w.doc.slug}:${n}`)),
    );
    expect(got.length).toBe(new Set(got).size);
    expect(new Set(got)).toEqual(want);
  });

  it("names a link by the longest text any citation gives it", () => {
    const aa = links.find((l) =>
      l.url.endsWith("/articles/artificial-analysis-intelligence-index-v5"),
    );
    expect(aa?.name).toBe("Artificial Analysis, Intelligence Index v5");
    for (const l of links) {
      const texts = all.filter((c) => c.url === l.url).map((c) => c.text.trim());
      expect(texts.every((t) => t.length <= l.name.length)).toBe(true);
    }
  });

  it("shows the address after the host, so links named alike differ", () => {
    const named = new Map<string, string[]>();
    for (const l of links)
      named.set(`${l.host} ${l.name}`, [...(named.get(`${l.host} ${l.name}`) ?? []), l.path]);
    for (const paths of named.values()) expect(new Set(paths).size).toBe(paths.length);
  });
});
