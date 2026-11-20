import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { EnergyLadderFigure, FleetDiagram } from "@/components/figures";
import { Markdown, SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { docTitle, indexOf, part, section } from "@/lib/content";
import { DESIGN, inventions } from "@/lib/inventions";

export const metadata: Metadata = {
  title: "The design",
  description:
    "Seven inventions for a 1000x cheaper frontier LLM: a split mind, wired-weight ternary silicon, a frozen core, lookup-in-storage memory, fewer tokens per task, context cartridges and a two-tier fleet.",
  alternates: { canonical: "/design" },
};

export default function Design() {
  const summary = section(DESIGN, "Summary", { withHeading: false });
  const listAt = summary.nodes.findIndex((n) => n.type === "list");
  const hides = section(DESIGN, "Where the remaining 1000x hides", { withHeading: false });
  const untested = section(DESIGN, "Experiments: what was tested");
  const all = inventions();
  const slugger = new GithubSlugger();
  return (
    <div className="wrap">
      <PageHead
        eyebrow="The design"
        title={docTitle(DESIGN)}
        files={[DESIGN]}
        lede={<Markdown nodes={part(summary, 0, 1).nodes} className="lede-prose" />}
      />
      <Callout kind="status" label="Status">
        <Markdown
          nodes={part(summary, indexOf(summary, "Nothing here is proven")).nodes}
          className="inline-prose"
        />
        <Markdown
          nodes={part(untested, indexOf(untested, "This session tested only")).nodes.slice(0, 1)}
          className="inline-prose callout-more"
        />
      </Callout>
      <div className="page-body">
        <SectionView section={part(summary, 1, listAt + 1)} slugger={slugger} />

        <h2 className="section-title" id="parts">
          The seven parts, one page each
        </h2>
        <div className="cards inventions">
          {all.map((x) => (
            <Link key={x.slug} href={`/design/${x.slug}`} className="card invention-card">
              <span className="kicker">{x.number}</span>
              <h3>{x.name}</h3>
              <p>{x.summary.split(/(?<=\.)\s/)[0]}</p>
              {x.experiments.length > 0 ? (
                <span className="chip chip-exp">
                  Falsified by experiment {x.experiments.map((e) => e.order).join(", ")}
                </span>
              ) : (
                <span className="chip chip-todo">TODO: no falsification experiment yet</span>
              )}
            </Link>
          ))}
        </div>
        <p className="fig-note" style={{ marginTop: 14 }}>
          The design doc's summary counts seven parts by what each does; its sections, which these
          pages follow, give six numbered inventions and the fleet.
        </p>

        <h2 className="section-title" id="where">
          {hides.title}
        </h2>
        <SectionView section={hides} slugger={slugger} />
        <EnergyLadderFigure />
        <FleetDiagram />

        <nav className="next-link" aria-label="Next">
          <Link href={`/design/${all[0]?.slug}`} className="card">
            <span className="kicker">Start with</span>
            <h3>
              {all[0]?.number}: {all[0]?.name}
            </h3>
          </Link>
        </nav>
      </div>
    </div>
  );
}
