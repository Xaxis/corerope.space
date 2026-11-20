import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { BatchFigure, BudgetFigure } from "@/components/figures";
import { LeverCard } from "@/components/LeverCard";
import { Markdown, SectionView } from "@/components/Markdown";
import { PageHead } from "@/components/Page";
import { SourceLink } from "@/components/SourceLink";
import { Toc, type TocItem } from "@/components/Toc";
import { docByFile, docTitle, lead, part, section, subsections } from "@/lib/content";
import { levers } from "@/lib/data";

const SURVEY = "research/01-report-path-to-1000x.md";

export const metadata: Metadata = {
  title: "The levers",
  description:
    "Every known LLM inference efficiency lever as of November 2026: measured gains, quality cost, overlaps and evidence grade, and why their naive product of a million shrinks to about a thousand.",
  alternates: { canonical: "/levers" },
};

export default function Levers() {
  const intro = lead(SURVEY);
  const terms = section(SURVEY, "Every lever attacks one of four terms", { withHeading: false });
  const measured = section(SURVEY, "What November 2026 actually measures");
  const subs = subsections(measured);
  const budget = section(SURVEY, "The multiplier budget");
  const budgetSubs = subsections(budget);
  const budgetIntro = part(
    budget,
    1,
    budget.nodes.findIndex((n) => n.type === "heading" && n.depth === 3),
  );
  const termsHeading = section(SURVEY, "Every lever attacks one of four terms").title;
  const slugger = new GithubSlugger();
  for (const id of [
    "four-terms",
    "measured",
    "budget",
    ...levers.sections.map((x) => x.key),
    "lever-map",
  ])
    slugger.slug(id);

  const items: TocItem[] = [
    { id: "four-terms", text: "Four terms, and the binding one rotates", depth: 2 },
    { id: "measured", text: "Lever by lever", depth: 2 },
    ...subs.map((s) => {
      const known = levers.sections.find((x) => x.heading === s.title);
      return {
        id: known?.key ?? "lever-map",
        text: known ? (s.title.split(":")[0] ?? s.title) : "Lever map and evidence grade",
        depth: 3,
      };
    }),
    { id: "budget", text: "The multiplier budget", depth: 2 },
  ];

  return (
    <div className="wrap">
      <PageHead eyebrow="The levers" title={docTitle(SURVEY)} files={[SURVEY]} />
      <div className="with-toc">
        <aside>
          <Toc items={items} />
        </aside>
        <div className="content">
          <SectionView section={intro} slugger={slugger} />

          <h2 className="section-title" id="four-terms">
            {termsHeading}
          </h2>
          <SectionView section={part(terms, 0, 1)} slugger={slugger} />
          <BatchFigure />
          <SectionView section={part(terms, 1)} slugger={slugger} />

          <h2 className="section-title" id="measured">
            {measured.title}
          </h2>
          {subs.map((s) => {
            const known = levers.sections.find((x) => x.heading === s.title);
            const cards = known ? levers.levers.filter((l) => l.section === known.key) : [];
            const body = part(s, 1);
            const note = known ? docByFile(known.note) : undefined;
            return (
              <section
                key={s.title}
                className="lever-section"
                aria-labelledby={known?.key ?? "lever-map"}
              >
                <h3 className="sub-title" id={known?.key ?? "lever-map"}>
                  {s.title}
                </h3>
                {cards.length > 0 && (
                  <div className="levers">
                    {cards.map((l) => (
                      <LeverCard key={l.lever} lever={l} />
                    ))}
                  </div>
                )}
                {known ? (
                  <>
                    <SectionView section={body} slugger={slugger} />
                    {note && (
                      <p className="deep-dive">
                        <Link href={`/research/${note.slug}`}>
                          Deep dive: the {note.short.toLowerCase()} note
                        </Link>
                        , with every finding, inference and gap.
                      </p>
                    )}
                  </>
                ) : (
                  <SectionView section={body} slugger={slugger} />
                )}
              </section>
            );
          })}

          <h2 className="section-title" id="budget">
            {budget.title}
          </h2>
          <Markdown nodes={budgetIntro.nodes} slugger={slugger} />
          <BudgetFigure />
          {budgetSubs.map((s) => (
            <SectionView key={s.title} section={s} top={3} slugger={slugger} />
          ))}
          <SourceLink path={SURVEY} startLine={budget.startLine} endLine={budget.endLine} />

          <nav className="next-link" aria-label="Next">
            <Link href="/design" className="card">
              <span className="kicker">Next</span>
              <h3>The design: inventing the stack the levers cannot reach</h3>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
