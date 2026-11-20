import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/Page";
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
    <div className="wrap">
      <PageHead
        eyebrow="Research library"
        title="The research, in full"
        lede="Everything on this site is drawn from these files. They are the source of truth: the pages render them, and the charts are generated from them."
      />
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

      <h2 className="section-title" id="sources">
        Every source cited
      </h2>
      <p className="body-text">
        {sources.length} distinct links from {hosts.length} sites, with each place they are cited.
        Labels in the notes say whether a figure was measured independently, claimed by a vendor, or
        derived.
      </p>
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
    </div>
  );
}
