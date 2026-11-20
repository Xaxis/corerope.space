import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { Calculator } from "@/components/Calculator";
import { Code } from "@/components/Code";
import { AmdahlFigure, CostBreakdownFigure, MultiplierFigure } from "@/components/figures";
import { SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { aroundPlaceholder, indexOf, part, section } from "@/lib/content";
import { presets } from "@/lib/data";
import { DESIGN } from "@/lib/inventions";
import { blobUrl } from "@/lib/site";

const MODEL = "experiments/cost-model/costmodel.py";

export const metadata: Metadata = {
  title: "Cost model",
  description:
    "An interactive port of the Corerope cost model: change any assumption and see the energy and dollar multipliers per task and per token against the late-2026 frontier, with the Amdahl fallback cap.",
  alternates: { canonical: "/cost-model" },
};

export default function CostModel() {
  const budget = section(DESIGN, "Multiplier budget", { withHeading: false });
  const split = aroundPlaceholder(budget);
  if (!split)
    throw new Error(
      "cost-model: the design doc's multiplier section lost its [Chart: ...] placeholder",
    );
  const dollars = indexOf(split.after, "Dollars lag energy");
  const slugger = new GithubSlugger();
  return (
    <div className="wrap">
      <PageHead
        eyebrow="The cost model"
        title="Change any assumption; see what is left of 1000x"
        lede="The design's cost model, running in your browser. It prices one core set against its throughput, adds energy, per-model NRE and memory storage, then applies tokens per task and the Tier B and GPU shares."
        files={[MODEL, DESIGN]}
      />
      <Calculator presets={{ fabric: presets("fabric"), as_written: presets("as_written") }} />
      <Callout kind="note">
        <p>
          This is{" "}
          <a href={blobUrl({ path: "site/lib/costmodel.ts" })}>a line-for-line TypeScript port</a>{" "}
          of <a href={blobUrl({ path: MODEL })}>costmodel.py</a>'s <code>run()</code>. A test checks
          it against outputs the Python wrote for the three presets and 250 random parameter sets,
          and every output must match to the last bit. The presets come from the script's own{" "}
          <code>S</code> table, read at build time. A model of a design is not a measurement: each
          input is an assumption that an experiment would test.
        </p>
      </Callout>

      <div className="page-body">
        <h2 className="section-title" id="budget">
          The multiplier budget against the late-2026 frontier
        </h2>
        <SectionView section={split.before} slugger={slugger} />
        <MultiplierFigure />
        <SectionView section={part(split.after, 0, dollars)} slugger={slugger} />
        <SectionView section={part(split.after, dollars)} slugger={slugger} />
        <CostBreakdownFigure />
        <AmdahlFigure />

        <h2 className="section-title" id="code">
          The model itself
        </h2>
        <p className="body-text">
          One short Python file. <code>S</code> holds each assumption's pessimistic, central and
          optimistic value; <code>run(i)</code> turns one case into multipliers. The scripts that
          turn its output into this site's charts live in{" "}
          <a href={blobUrl({ path: "scripts/data/costmodel_data.py" })}>
            scripts/data/costmodel_data.py
          </a>
          .
        </p>
        <Code path={MODEL} open />

        <nav className="next-link" aria-label="Next">
          <Link href="/experiments" className="card">
            <span className="kicker">Next</span>
            <h3>Experiments: what was tested, and what to run next</h3>
          </Link>
        </nav>
      </div>
    </div>
  );
}
