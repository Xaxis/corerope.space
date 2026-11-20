import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { Markdown, SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { SourceLink } from "@/components/SourceLink";
import { Toc } from "@/components/Toc";
import { DOCS, docTitle, part, section, sectionsNamed } from "@/lib/content";
import { DESIGN } from "@/lib/inventions";

const SURVEY = "research/01-report-path-to-1000x.md";
const BRIEF = "00-BRIEF.md";

export const metadata: Metadata = {
  title: "Risks and prior art",
  description:
    "What could kill the Corerope design, the known gaps in its evidence, the open problems the survey found, and the prior art it builds on.",
  alternates: { canonical: "/risks" },
};

export default function Risks() {
  const kill = section(DESIGN, "What could kill it", { withHeading: false });
  const gaps = section(BRIEF, "Known gaps to flag on the site", { withHeading: false });
  const odds = section(SURVEY, "Honest odds");
  const prior = section(DESIGN, "Prior art and sources", { withHeading: false });
  const notes = DOCS.filter((d) => d.kind === "note");
  const slugger = new GithubSlugger();
  for (const id of ["kill", "gaps", "odds", "open", "prior"]) slugger.slug(id);
  return (
    <div className="wrap">
      <PageHead
        eyebrow="Risks and prior art"
        title="What could kill it"
        lede={<Markdown nodes={part(kill, 0, 1).nodes} className="lede-prose" />}
        files={[DESIGN, SURVEY]}
      />
      <div className="with-toc">
        <aside>
          <Toc
            items={[
              { id: "kill", text: "The risks", depth: 2 },
              { id: "gaps", text: "Known gaps in the evidence", depth: 2 },
              { id: "odds", text: "Honest odds", depth: 2 },
              { id: "open", text: "What the notes could not find", depth: 2 },
              { id: "prior", text: "Prior art and sources", depth: 2 },
            ]}
          />
        </aside>
        <div className="content">
          <h2 className="section-title" id="kill">
            The risks
          </h2>
          <SectionView section={part(kill, 1)} slugger={slugger} />

          <h2 className="section-title" id="gaps">
            Known gaps in the evidence
          </h2>
          <div className="gaps">
            {gaps.nodes
              .filter((n) => n.type === "list")
              .flatMap((l) => (l.type === "list" ? l.children : []))
              .map((item) => (
                <Callout kind="gap" key={item.position?.start.line}>
                  <Markdown nodes={item.children} className="inline-prose" />
                </Callout>
              ))}
          </div>
          <SourceLink path={BRIEF} startLine={gaps.startLine} endLine={gaps.endLine} />

          <h2 className="section-title" id="odds">
            {odds.title}
          </h2>
          <SectionView section={part(odds, 1)} slugger={slugger} />

          <h2 className="section-title" id="open">
            What the notes could not find
          </h2>
          <p className="body-text">
            Each research note ends every question with its gaps: what the sources did not measure,
            or what this research could not verify. They are collected here, unedited.
          </p>
          {notes.map((d) => {
            const list = sectionsNamed(d.file, "Gaps");
            return (
              <details key={d.slug} className="note-gaps">
                <summary>
                  <span>{docTitle(d.file)}</span>
                  <span className="muted"> {list.length} questions</span>
                </summary>
                {list.map((g) => (
                  <div key={g.startLine} className="note-gap">
                    <h3 className="note-gap-q">{g.parent}</h3>
                    <SectionView section={g} slugger={slugger} />
                  </div>
                ))}
                <p className="deep-dive">
                  <Link href={`/research/${d.slug}`}>Read the whole note</Link>
                </p>
              </details>
            );
          })}

          <h2 className="section-title" id="prior">
            Prior art and sources
          </h2>
          <SectionView section={prior} slugger={slugger} />
          <p className="deep-dive">
            Every source the research cites, with where it is cited:{" "}
            <Link href="/research#sources">the research library</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
