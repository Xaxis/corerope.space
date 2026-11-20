import GithubSlugger from "github-slugger";
import type { RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { ExperimentCard } from "@/components/ExperimentCard";
import {
  AmdahlFigure,
  EnergyLadderFigure,
  FleetDiagram,
  GatesFigure,
  SpwFigure,
  TokensFigure,
} from "@/components/figures";
import { SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { part, section } from "@/lib/content";
import { roadmap } from "@/lib/data";
import { DESIGN, invention, inventions, type Slug } from "@/lib/inventions";
import { blobUrl } from "@/lib/site";

/** Figures that belong after a paragraph of a section, by how that paragraph starts. */
const FIGURES: Partial<Record<Slug, { after: string; figure: ReactNode }[]>> = {
  "wired-ternary": [
    { after: "Gate counts are a proxy", figure: <GatesFigure /> },
    { after: "Shared partial-sum wiring", figure: <SpwFigure /> },
    { after: "The energy assumption to test", figure: <EnergyLadderFigure /> },
  ],
  "tokens-per-task": [{ after: "Cheaper tokens get spent", figure: <TokensFigure /> }],
  "two-tier-fleet": [
    { after: "[Diagram:", figure: <FleetDiagram /> },
    { after: "Tier B is the same design", figure: <AmdahlFigure /> },
  ],
};

export function generateStaticParams() {
  return inventions().map((x) => ({ slug: x.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const x = invention((await params).slug);
  if (!x) return {};
  return {
    title: `${x.number}: ${x.name}`,
    description: x.summary
      .split(/(?<=\.)\s/)
      .slice(0, 2)
      .join(" "),
    alternates: { canonical: `/design/${x.slug}` },
  };
}

export default async function InventionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const x = invention(slug);
  if (!x) notFound();
  const all = inventions();
  const at = all.findIndex((y) => y.slug === x.slug);
  const prev = all[at - 1];
  const next = all[at + 1];
  const body = part(x.section, 1);
  const figures = FIGURES[x.slug] ?? [];
  const slugger = new GithubSlugger();

  // Cut the section after each paragraph that a figure follows; a "[Diagram: ...]" placeholder is replaced by its figure.
  const chunks: { from: number; to: number; figure?: ReactNode }[] = [];
  let from = 0;
  body.nodes.forEach((n: RootContent, i) => {
    const f = figures.find((g) => mdToString(n).startsWith(g.after));
    if (!f) return;
    const placeholder = f.after.startsWith("[");
    chunks.push({ from, to: placeholder ? i : i + 1, figure: f.figure });
    from = i + 1;
  });
  chunks.push({ from, to: body.nodes.length });
  const table = section(DESIGN, "Experiments: what was tested");

  return (
    <div className="wrap">
      <PageHead eyebrow={x.number} title={x.name} files={[DESIGN]}>
        <p className="crumbs" style={{ marginTop: 18, marginBottom: 0 }}>
          <Link href="/design">The design</Link> / {x.number}
        </p>
      </PageHead>
      <div className="page-body">
        {chunks.map((c) => (
          <Fragment key={c.from}>
            {c.to > c.from && <SectionView section={part(body, c.from, c.to)} slugger={slugger} />}
            {c.figure}
          </Fragment>
        ))}

        <h2 className="section-title" id="falsify">
          The experiment that would falsify it
        </h2>
        {x.experiments.length > 0 ? (
          <div className="exps">
            {x.experiments.map((e) => (
              <ExperimentCard key={e.order} e={e} />
            ))}
          </div>
        ) : (
          <Callout kind="todo" label="TODO">
            <p>
              <strong>TODO: no falsification experiment yet.</strong> The design doc's{" "}
              <a href={blobUrl({ path: DESIGN, startLine: roadmap.line, endLine: table.endLine })}>
                table of next experiments
              </a>{" "}
              has no row that tests {x.heading.replace(/^Invention \d+:\s*/, "")}. The research
              leaves this open; it should get one before anyone relies on it.
            </p>
          </Callout>
        )}

        <nav className="pager" aria-label="Other parts of the design">
          {prev ? (
            <Link href={`/design/${prev.slug}`} className="card">
              <span className="kicker">Previous: {prev.number}</span>
              <h3>{prev.name}</h3>
            </Link>
          ) : (
            <Link href="/design" className="card">
              <span className="kicker">Back to</span>
              <h3>The design</h3>
            </Link>
          )}
          {next ? (
            <Link href={`/design/${next.slug}`} className="card pager-next">
              <span className="kicker">Next: {next.number}</span>
              <h3>{next.name}</h3>
            </Link>
          ) : (
            <Link href="/cost-model" className="card pager-next">
              <span className="kicker">Next</span>
              <h3>The cost model</h3>
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
