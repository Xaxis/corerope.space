import type { Metadata } from "next";
import Link from "next/link";
import { Chapter, PageIntro, Pager } from "@/components/Template";
import { citations, DOCS, docTitle, summaryOf, wordCount } from "@/lib/content";
import { blobUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research library",
  description:
    "The survey, the design, six research notes and the recorded experiment results, in full, with every source they cite.",
  alternates: { canonical: "/research" },
};

const KIND: Record<string, string> = {
  survey: "The survey",
  design: "The design",
  note: "Research note",
  results: "Recorded results",
};

export default function Research() {
  const all = DOCS.flatMap((d) => citations(d.file).map((c) => ({ ...c, doc: d })));
  const byUrl = new Map<string, typeof all>();
  for (const c of all) byUrl.set(c.url, [...(byUrl.get(c.url) ?? []), c]);
  const sources = [...byUrl.entries()]
    .map(([url, cs]) => ({ url, host: new URL(url).hostname.replace(/^www\./, ""), cs }))
    .sort((a, b) => a.host.localeCompare(b.host) || a.url.localeCompare(b.url));
  const hosts = [...new Set(sources.map((s) => s.host))];
  return (
    <>
      <PageIntro
        n="06"
        kicker="The research"
        title="The research, in full"
        lede={
          <p className="q">
            Everything on this site is drawn from these files. They are the source of truth: the
            pages render them, and the charts are generated from them.
          </p>
        }
        files={DOCS.filter((d) => d.kind !== "note").map((d) => d.file)}
        stats={[
          {
            value: String(DOCS.length),
            label: "Documents",
            note: `${DOCS.filter((d) => d.kind === "note").length} of them research notes`,
          },
          {
            value: DOCS.reduce((n, d) => n + wordCount(d.file), 0).toLocaleString("en-US"),
            label: "Words",
          },
          {
            value: String(sources.length),
            label: "Distinct sources cited",
            note: `From ${hosts.length} sites`,
            tone: "accent",
          },
        ]}
      />
      <Chapter id="library" n="Chapter 1" title="The documents">
        <div className="cards docs">
          {DOCS.map((d) => {
            const p = summaryOf(d.file);
            return (
              <Link key={d.slug} href={`/research/${d.slug}`} className="card">
                <span className="kicker">{KIND[d.kind]}</span>
                <h3>{docTitle(d.file)}</h3>
                {p && <p>{p.length > 220 ? `${p.slice(0, p.lastIndexOf(" ", 210))}...` : p}</p>}
                <span className="more">
                  {wordCount(d.file).toLocaleString("en-US")} words ·{" "}
                  <span className="mono">{d.file.split("/").pop()}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </Chapter>

      <Chapter
        id="sources"
        n="Chapter 2"
        title="Every source cited"
        lede={
          <p className="q">
            {sources.length} distinct links from {hosts.length} sites, with each place they are
            cited. Labels in the notes say whether a figure was measured independently, claimed by a
            vendor, or derived.
          </p>
        }
      >
        <ol className="sources">
          {sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} rel="noopener noreferrer" className="source-url">
                {s.cs[0]?.text || s.host}
              </a>
              <span className="source-host">{s.host}</span>
              <span className="source-where">
                Cited in{" "}
                {[...new Map(s.cs.map((c) => [`${c.file}:${c.line}`, c])).values()].map((c, i) => (
                  <span key={`${c.file}:${c.line}`}>
                    {i > 0 && ", "}
                    <a href={blobUrl({ path: c.file, startLine: c.line })}>
                      {c.doc.short.toLowerCase()} line {c.line}
                    </a>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
      </Chapter>
      <Pager current="/research" />
    </>
  );
}
