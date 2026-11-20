import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AmdahlStage } from "@/components/Amdahl";
import { ExperimentCard } from "@/components/ExperimentCard";
import {
  EnergyLadderFigure,
  FleetDiagram,
  GatesFigure,
  SpwFigure,
  TokensFigure,
} from "@/components/figures";
import { Markdown } from "@/components/Markdown";
import { Callout } from "@/components/Page";
import { SubNav } from "@/components/SubNav";
import { Chapter, PageIntro, Pager, Q, researchHref } from "@/components/Template";
import { Stage } from "@/components/three/Stage";
import { docTitle, indexOf, quote, type Section, section } from "@/lib/content";
import { multipliers } from "@/lib/data";
import { DESIGN, type Invention, inventions, type Slug } from "@/lib/inventions";
import { times } from "@/lib/scale";

export const metadata: Metadata = {
  title: "The design",
  description:
    "The seven parts of the Corerope stack, each with the cost term it attacks, the way it could fail, and the experiment that would falsify it.",
  alternates: { canonical: "/design" },
};

/** The paragraph in each part that says how it could go wrong, by its opening words. */
const RISK: Record<Slug, { label: string; start: string; sentences: number }> = {
  "split-mind": {
    label: "Why it could fail",
    start: "Knowledge and reasoning may not separate cleanly",
    sentences: 3,
  },
  "wired-ternary": {
    label: "The assumption to test",
    start: "The model assumes 0.1 pJ per weight-operation",
    sentences: 2,
  },
  "rom-core": {
    label: "What it cannot fix",
    start: "A flaw inside the frozen reasoning itself",
    sentences: 2,
  },
  "lookup-in-storage": {
    label: "Open question",
    start: "NAND pages are 16 KB or larger",
    sentences: 2,
  },
  "tokens-per-task": {
    label: "If it fails",
    start: "If these fail and the small core needs",
    sentences: 1,
  },
  "context-cartridges": { label: "The budget", start: "Per user the core holds", sentences: 2 },
  "two-tier-fleet": {
    label: "The open risk",
    start: "The open risk is the hard-task share",
    sentences: 1,
  },
};

/** The block that follows a paragraph starting with `start`: a list or table the part spells out. */
function after(s: Section, start: string): Section["nodes"] {
  const i = indexOf(s, start);
  const next = s.nodes[i + 1];
  return next ? [next] : [];
}

function evidence(x: Invention): ReactNode {
  const s = x.section;
  switch (x.slug) {
    case "split-mind":
      return (
        <>
          <Stage
            scene="fleet"
            step={0}
            className="stage-wide"
            label="A 3D split mind: a small wired core above a wide memory tier of NAND pages; lookups light pages and beams rise to the core as tasks arrive."
          />
          <Markdown nodes={after(s, "The design.")} className="q-prose" />
        </>
      );
    case "wired-ternary":
      return (
        <>
          <Stage
            scene="wired"
            className="stage-wide"
            label="A 3D wired ternary layer: activations run down input rails, drop through +1 and -1 vias into plus and minus buses, and light the adders."
          />
          <GatesFigure />
          <SpwFigure />
        </>
      );
    case "rom-core":
      return (
        <>
          <Stage
            scene="corerope"
            className="stage-wide"
            label="Core rope memory in 3D: a program woven into wires and cores, fixed once it is made, as the frozen core is."
          />
          <Markdown nodes={after(s, "The training contract.")} className="q-prose" />
        </>
      );
    case "lookup-in-storage":
      return <Markdown nodes={after(s, "Two levels, split by when the address is known.")} />;
    case "tokens-per-task":
      return (
        <>
          <TokensFigure />
          <Markdown
            nodes={[s.nodes.find((n) => n.type === "list")].filter((n) => n !== undefined)}
            className="q-prose"
          />
        </>
      );
    case "context-cartridges":
      return <Markdown nodes={after(s, "What is new here.")} className="q-prose" />;
    case "two-tier-fleet":
      return (
        <>
          <AmdahlStage />
          <FleetDiagram />
        </>
      );
  }
}

export default function Design() {
  const parts = inventions();
  const et = multipliers.rows.find((r) => r.key === "energy_task");
  const dt = multipliers.rows.find((r) => r.key === "dollars_task");
  const where = section(DESIGN, "Where the remaining 1000x hides");
  const table = where.nodes.find((n) => n.type === "table");
  const src = (s: Section) => ({ path: DESIGN, startLine: s.startLine, endLine: s.endLine });

  return (
    <>
      <PageIntro
        n="03"
        kicker="The design"
        title={docTitle(DESIGN)}
        lede={<Q q={quote(DESIGN, "Summary", "The invented stack reaches about", 2)} />}
        files={[DESIGN]}
        stats={[
          ...(et
            ? [
                {
                  value: times(et.central),
                  label: "Less energy per solved task",
                  note: `Central case; ${times(et.low)} to ${times(et.high)}`,
                  tone: "accent" as const,
                },
              ]
            : []),
          ...(dt
            ? [
                {
                  value: times(dt.central),
                  label: "Lower cost per solved task",
                  note: `Central case; ${times(dt.low)} to ${times(dt.high)}`,
                  tone: "accent" as const,
                },
              ]
            : []),
          {
            value: String(parts.length),
            label: "Parts, each with its test",
            note: `${parts.filter((x) => x.experiments.length === 0).length} still lack a falsification experiment`,
          },
        ]}
      >
        <p className="intro-status">
          <span className="pill">
            <span className="dot" aria-hidden="true" />A design, not a result
          </span>
          {quote(DESIGN, "Summary", "Nothing here is proven at scale", 2).text}
        </p>
      </PageIntro>
      <SubNav
        label="Parts of the design"
        items={[
          { id: "where", text: "Where 1000x hides" },
          ...parts.map((x) => ({ id: x.slug, text: x.short })),
        ]}
      />

      <Chapter
        id="where"
        n="Overview"
        title={where.title}
        lede={
          <>
            <Q q={quote(DESIGN, where.title, "The headroom is in the gap", 2)} />
            <Q q={quote(DESIGN, where.title, "Each row's floor is reachable only if", 3)} />
          </>
        }
        source={src(where)}
        more={{ href: researchHref(DESIGN, where.title), label: "Read the full section" }}
      >
        {table && <Markdown nodes={[table]} />}
        <EnergyLadderFigure />
      </Chapter>

      {parts.map((x) => {
        const risk = RISK[x.slug];
        return (
          <Chapter
            key={x.slug}
            id={x.slug}
            n={x.number}
            title={x.name}
            layout="split"
            lede={<p className="q">{x.summary}</p>}
            aside={
              <div className="part-risk">
                <p className="part-label">{risk.label}</p>
                <Q q={quote(DESIGN, x.heading, risk.start, risk.sentences)} />
              </div>
            }
            source={src(x.section)}
            more={{ href: researchHref(DESIGN, x.heading), label: "Read the full section" }}
          >
            {evidence(x)}
            <div className="part-test">
              <h3 className="part-label">
                {x.experiments.length === 1
                  ? "The experiment that would falsify it"
                  : "The experiments that would falsify it"}
              </h3>
              {x.experiments.length > 0 ? (
                x.experiments.map((e) => <ExperimentCard key={e.order} e={e} links={false} />)
              ) : (
                <Callout kind="todo" label="TODO">
                  <p>
                    <strong>TODO: no falsification experiment yet.</strong> The design doc's
                    experiment table has none for this part.
                  </p>
                </Callout>
              )}
            </div>
          </Chapter>
        );
      })}

      <Pager current="/design" />
    </>
  );
}
