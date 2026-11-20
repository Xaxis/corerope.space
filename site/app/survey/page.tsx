import type { Metadata } from "next";
import Link from "next/link";
import {
  BatchFigure,
  BudgetFigure,
  DecodeFigure,
  MarketFigure,
  TokensFigure,
} from "@/components/figures";
import { SubNav } from "@/components/SubNav";
import { Chapter, PageIntro, Pager, Q, researchHref } from "@/components/Template";
import { Stage } from "@/components/three/Stage";
import { docByFile, docTitle, quote, section } from "@/lib/content";
import { levers, marketTrend } from "@/lib/data";
import { times } from "@/lib/scale";

const SURVEY = "research/01-report-path-to-1000x.md";

export const metadata: Metadata = {
  title: "The survey",
  description:
    "Every known LLM inference efficiency lever as of November 2026, measured against two baselines: why 1000x is mostly the market trend against 2024, and why the known levers give about 35x against the late-2026 frontier.",
  alternates: { canonical: "/survey" },
};

const CHAPTERS = [
  { id: "baseline", heading: "Two baselines and one metric", text: "Baselines" },
  { id: "terms", heading: "Every lever attacks one of four terms", text: "Four terms" },
  { id: "levers", heading: "What November 2026 actually measures", text: "Lever by lever" },
  { id: "budget", heading: "The multiplier budget", text: "The budget" },
  { id: "odds", heading: "Honest odds", text: "Honest odds" },
] as const;

function src(heading: string) {
  const s = section(SURVEY, heading);
  return { path: SURVEY, startLine: s.startLine, endLine: s.endLine };
}

export default function Survey() {
  const total = (b: "b2024" | "b2026", what: string) =>
    levers.budgets[b].rows.find((r) => r.kind === "total" && !r.naive && r.label.includes(what))
      ?.central;
  const rates = marketTrend.rates.map((r) => r.by_nov_2026);
  const title = (h: string) => section(SURVEY, h).title;

  return (
    <>
      <PageIntro
        n="02"
        kicker="The survey"
        title={docTitle(SURVEY)}
        lede={
          <Q q={quote(SURVEY, "", "A roughly 1000x cut in cost and energy per solved task", 1)} />
        }
        files={[SURVEY]}
        stats={[
          {
            value: `~${times(total("b2024", "cost") ?? 0)}`,
            label: "Known levers, against 2024",
            note: `In dollars per solved task; ~${times(total("b2024", "energy") ?? 0)} in energy`,
          },
          {
            value: `~${times(total("b2026", "cost") ?? 0)}`,
            label: "Known levers, against late 2026",
            note: `In dollars per solved task; ~${times(total("b2026", "energy") ?? 0)} in energy`,
            tone: "accent",
          },
          {
            value: `${times(Math.min(...rates))} to ${times(Math.max(...rates))}`,
            label: "The market alone, 2024 to now",
            note: "Published price declines at constant capability, compounded",
          },
        ]}
      />
      <SubNav
        label="Chapters of the survey"
        items={CHAPTERS.map((c) => ({ id: c.id, text: c.text }))}
      />

      <Chapter
        id="baseline"
        n="Chapter 1"
        title={title("Two baselines and one metric")}
        lede={<Q q={quote(SURVEY, "Two baselines", 'The "1000x" claim only means something', 2)} />}
        source={src("Two baselines")}
        more={{
          href: researchHref(SURVEY, title("Two baselines")),
          label: "Read the full section",
        }}
      >
        <TokensFigure />
        <MarketFigure />
      </Chapter>

      <Chapter
        id="terms"
        n="Chapter 2"
        layout="split"
        title={title("Every lever attacks one of four terms")}
        lede={
          <>
            <Q
              q={quote(
                SURVEY,
                "Every lever attacks",
                "Cost per solved task factors into four terms",
                2,
              )}
            />
            <Q
              q={quote(
                SURVEY,
                "Every lever attacks",
                "On H100-class silicon, reading one 8-bit weight",
                2,
              )}
            />
          </>
        }
        source={src("Every lever attacks")}
        more={{
          href: researchHref(SURVEY, title("Every lever attacks")),
          label: "Read the full section",
        }}
      >
        <Stage
          scene="memory"
          className="stage-wide"
          label="A 3D GPU package with HBM stacks beside the die, and the weights streaming from memory to the die as glowing bits."
        />
        <DecodeFigure />
        <BatchFigure />
      </Chapter>

      <Chapter
        id="levers"
        n="Chapter 3"
        title={title("What November 2026 actually measures")}
        lede={
          <p className="q">
            {levers.sections.length} families of levers, each with what has actually been measured,
            what it costs in quality, and what it overlaps with. Each verdict is the survey's own
            heading; the full section and the note behind it hold every source.
          </p>
        }
        source={src("What November 2026 actually measures")}
      >
        <div className="families">
          {levers.sections.map((s, i) => {
            const [name, verdict] = s.heading.split(/:\s*/, 2);
            const rows = levers.levers.filter((l) => l.section === s.key);
            const note = docByFile(s.note);
            return (
              <article key={s.key} className="family">
                <p className="family-n">{String(i + 1).padStart(2, "0")}</p>
                <h3>{name}</h3>
                {verdict && <p className="family-verdict">{verdict}</p>}
                {rows.length > 0 && (
                  <ul className="family-rows">
                    {rows.map((l) => (
                      <li key={l.lever}>
                        <p className="family-lever">
                          <b>{l.lever}</b>
                          <span>{l.gain}</span>
                        </p>
                        <dl className="family-meta">
                          <div>
                            <dt>Quality cost</dt>
                            <dd>{l.quality_cost}</dd>
                          </div>
                          <div>
                            <dt>Overlaps with</dt>
                            <dd>{l.overlaps}</dd>
                          </div>
                          <div>
                            <dt>Evidence</dt>
                            <dd>{l.evidence}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="family-links">
                  <Link href={researchHref(SURVEY, s.heading)}>The section</Link>
                  {note && (
                    <Link href={`/research/${note.slug}`}>The {note.short.toLowerCase()} note</Link>
                  )}
                </p>
              </article>
            );
          })}
        </div>
      </Chapter>

      <Chapter
        id="budget"
        n="Chapter 4"
        title={title("The multiplier budget")}
        lede={
          <Q
            q={quote(
              SURVEY,
              "The multiplier budget",
              "A useful check is the ceiling the physics allows",
              3,
            )}
          />
        }
        source={src("The multiplier budget")}
        more={{
          href: researchHref(SURVEY, title("The multiplier budget")),
          label: "Read the full section, with tables A and B",
        }}
      >
        <BudgetFigure />
      </Chapter>

      <Chapter
        id="odds"
        n="Chapter 5"
        title={title("Honest odds")}
        lede={
          <>
            <Q q={quote(SURVEY, "Honest odds", "Against B2026 at late-2026 frontier quality", 3)} />
            <Q q={quote(SURVEY, "Conclusion", 'Whether "1000x cheaper" is achievable', 3)} />
          </>
        }
        source={src("Honest odds")}
        more={{ href: researchHref(SURVEY), label: "Read the whole survey" }}
      />

      <Pager current="/survey" />
    </>
  );
}
