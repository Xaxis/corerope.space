import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SourceFilter } from "@/components/SourceFilter";
import { Chapter, PageIntro, Pager } from "@/components/Template";
import { DOCS, docTitle, summaryOf, wordCount } from "@/lib/content";
import { blobUrl } from "@/lib/site";
import { sourceSites } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Research library",
  description: `The survey, the design, ${DOCS.filter((d) => d.kind === "note").length} research notes and the recorded experiment results, in full, with every source they cite.`,
  alternates: { canonical: "/research" },
};

const KIND: Record<string, string> = {
  survey: "The survey",
  design: "The design",
  note: "Research note",
  results: "Recorded results",
};

/** A document's short name inside a sentence: "the survey", "low-bit numerics", but "MoE and ...". */
function inline(short: string): string {
  const first = short.split(" ")[0] ?? "";
  return /[A-Z]/.test(first.slice(1)) ? short : short.charAt(0).toLowerCase() + short.slice(1);
}

export default function Research() {
  const sites = sourceSites();
  const links = sites.reduce((n, s) => n + s.links.length, 0);
  const cited = new Set(
    sites.flatMap((s) => s.links.flatMap((l) => l.where.map((w) => w.doc.slug))),
  );
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
            value: String(links),
            label: "Distinct sources cited",
            note: `From ${sites.length} sites`,
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
            {links} distinct links from {sites.length} sites, each named as the research names it,
            with every line that cites it. Labels in the notes say whether a figure was measured
            independently, claimed by a vendor, or derived.
          </p>
        }
      >
        <SourceFilter
          docs={DOCS.filter((d) => cited.has(d.slug)).map((d) => ({
            slug: d.slug,
            short: d.short,
          }))}
          total={links}
          sites={sites.length}
        >
          <ol className="source-sites">
            {sites.map((s) => (
              <li key={s.host} className="source-site" data-site>
                <h3 className="source-site-host">
                  {/* A narrow column: a long host breaks after a dot, never inside a word. */}
                  {s.host.split(".").map((part, i, all) => (
                    <Fragment key={all.slice(0, i + 1).join(".")}>
                      {i > 0 && (
                        <>
                          .<wbr />
                        </>
                      )}
                      {part}
                    </Fragment>
                  ))}
                  {s.links.length > 1 && <span>{s.links.length} links</span>}
                </h3>
                <ul className="source-links">
                  {s.links.map((l) => (
                    <li
                      key={l.url}
                      data-q={[l.name, s.host, l.path, ...l.where.map((w) => w.doc.short)]
                        .join(" ")
                        .toLowerCase()}
                      data-docs={l.where.map((w) => w.doc.slug).join(" ")}
                    >
                      <a href={l.url} rel="noopener noreferrer" className="source-url">
                        {l.name}
                      </a>
                      {l.path && <span className="source-path">{l.path}</span>}
                      <span className="source-where">
                        Cited in{" "}
                        {l.where.map((w, i) => (
                          <span key={w.doc.slug}>
                            {i > 0 && "; "}
                            {inline(w.doc.short)} {w.lines.length > 1 ? "lines" : "line"}{" "}
                            {w.lines.map((n) => (
                              <span key={n}>
                                {" "}
                                <a
                                  href={blobUrl({ path: w.doc.file, startLine: n })}
                                  aria-label={`${w.doc.short}, line ${n}`}
                                >
                                  {n}
                                </a>
                              </span>
                            ))}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </SourceFilter>
      </Chapter>
      <Pager current="/research" />
    </>
  );
}
