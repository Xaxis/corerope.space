// Every external link the research cites, grouped by site, each with the places that cite it.
import { type Citation, citations, DOCS } from "./content";

type Doc = (typeof DOCS)[number];

export type SourceLink = {
  url: string;
  /** The most specific text any citation gives the link ("Artificial Analysis, Intelligence Index v5" over "Artificial Analysis"). */
  name: string;
  /** The address after the host, which tells apart links the notes name alike. */
  path: string;
  /** Where it is cited, one entry per document in DOCS order, lines ascending and unique. */
  where: { doc: Doc; lines: number[] }[];
};

export type SourceSite = { host: string; links: SourceLink[] };

const hostOf = (url: string) => new URL(url).hostname.replace(/^www\./, "");

function pathOf(url: string): string {
  const u = new URL(url);
  const p = `${u.pathname}${u.search}`.replace(/\/$/, "");
  return p === "" ? "" : decodeURI(p);
}

function nameOf(cs: Citation[], host: string): string {
  let best = "";
  for (const c of cs) if (c.text.trim().length > best.length) best = c.text.trim();
  return best || host;
}

export function sourceSites(docs: readonly Doc[] = DOCS): SourceSite[] {
  const byUrl = new Map<string, (Citation & { doc: Doc })[]>();
  for (const doc of docs)
    for (const c of citations(doc.file))
      byUrl.set(c.url, [...(byUrl.get(c.url) ?? []), { ...c, doc }]);
  const bySite = new Map<string, SourceLink[]>();
  for (const [url, cs] of byUrl) {
    const host = hostOf(url);
    const where = docs
      .map((doc) => ({
        doc,
        lines: [...new Set(cs.filter((c) => c.doc === doc).map((c) => c.line))].sort(
          (a, b) => a - b,
        ),
      }))
      .filter((w) => w.lines.length > 0);
    bySite.set(host, [
      ...(bySite.get(host) ?? []),
      { url, name: nameOf(cs, host), path: pathOf(url), where },
    ]);
  }
  return [...bySite.entries()]
    .map(([host, links]) => ({
      host,
      links: links.sort((a, b) => a.path.localeCompare(b.path) || a.url.localeCompare(b.url)),
    }))
    .sort((a, b) => a.host.localeCompare(b.host));
}
