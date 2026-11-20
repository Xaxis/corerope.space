import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "@/components/Code";
import { ExperimentCard } from "@/components/ExperimentCard";
import { GatesFigure, SpwFigure } from "@/components/figures";
import { Markdown, SectionView } from "@/components/Markdown";
import { Callout, PageHead } from "@/components/Page";
import { SourceLink } from "@/components/SourceLink";
import { Toc } from "@/components/Toc";
import { part, section } from "@/lib/content";
import { gates, multipliers, roadmap, spw } from "@/lib/data";
import { DESIGN } from "@/lib/inventions";
import { times } from "@/lib/scale";
import { blobUrl } from "@/lib/site";

const RESULTS = "experiments/RESULTS.md";
const SURVEY = "research/01-report-path-to-1000x.md";

export const metadata: Metadata = {
  title: "Experiments",
  description:
    "What the Corerope research tested (Yosys gate counts for wired layers, a shared partial-sum add-count model, the cost model), re-run for this site, and the seven experiments that would confirm or kill the design.",
  alternates: { canonical: "/experiments" },
};

export default function Experiments() {
  const s = section(DESIGN, "Experiments: what was tested", { withHeading: false });
  const intro = part(s, 0, 1);
  const program = section(SURVEY, "A ranked, four-phase program");
  const et = multipliers.rows.find((r) => r.key === "energy_task");
  const slugger = new GithubSlugger();
  for (const id of ["run", "roadmap", "program", "scripts"]) slugger.slug(id);
  return (
    <div className="wrap">
      <PageHead
        eyebrow="Experiments"
        title={s.title}
        lede={<Markdown nodes={intro.nodes} className="lede-prose" />}
        files={[DESIGN, RESULTS]}
      />
      <div className="with-toc">
        <aside>
          <Toc
            items={[
              { id: "run", text: "What was run, and re-run", depth: 2 },
              { id: "roadmap", text: "Seven experiments to run next", depth: 2 },
              { id: "program", text: "The survey's program on GPUs", depth: 2 },
              { id: "scripts", text: "The scripts", depth: 2 },
            ]}
          />
        </aside>
        <div className="content">
          <h2 className="section-title" id="run">
            What was run, and re-run for this site
          </h2>
          <p className="body-text">
            Three pieces of arithmetic about the silicon, recorded in{" "}
            <a href={blobUrl({ path: RESULTS })}>RESULTS.md</a>. This site's build pipeline runs all
            three again from the scripts in the repository and checks the output against the record.
          </p>
          <div className="stats repro">
            <div className="stat">
              <p className="label">Wired-layer gate counts, Yosys {gates.yosys}</p>
              <p className="value">{gates.reproduced}</p>
              <p className="foot">Designs whose cell count matches the recorded one exactly.</p>
            </div>
            <div className="stat">
              <p className="label">Shared partial-sum add counts</p>
              <p className="value">{spw.matches_recorded ? "All match" : "Differ"}</p>
              <p className="foot">Every ratio for the four layer shapes, to two decimals.</p>
            </div>
            <div className="stat">
              <p className="label">Cost model, three cases and the Amdahl sweep</p>
              <p className="value">Exact</p>
              <p className="foot">
                Central case {et ? times(et.central) : ""} energy per task, as recorded. The site's
                TypeScript port matches to the last bit.
              </p>
            </div>
          </div>
          <Callout kind="note">
            <p>
              <strong>Reproduce it.</strong> With Python 3.12 and <code>uv</code>:{" "}
              <code>make venv</code>, then <code>make synth</code> (the 15 syntheses take minutes),{" "}
              <code>make data</code> and <code>make check</code>, which compares every output with
              RESULTS.md and runs the site's tests.
            </p>
          </Callout>
          <GatesFigure />
          <SpwFigure />
          <Callout kind="gap" label="Known gap">
            <p>
              <strong>Gate counts are not energy.</strong> They exclude wire energy, which dominates
              fully spatial designs, and Yosys ran without ABC logic optimization. Experiment 1
              below is the measurement that would settle it.
            </p>
          </Callout>

          <h2 className="section-title" id="roadmap">
            Seven experiments, cheapest decisive first
          </h2>
          <p className="body-text">
            Each one confirms or kills a part of the design. Nothing about model quality has been
            tested yet; experiments 2 to 6 are where that happens.
          </p>
          <div className="exps">
            {roadmap.experiments.map((e) => (
              <ExperimentCard key={e.order} e={e} />
            ))}
          </div>
          <SourceLink path={DESIGN} startLine={roadmap.line} endLine={s.endLine} />

          <h2 className="section-title" id="program">
            The survey's program, for GPUs
          </h2>
          <p className="body-text">
            Before the design, the survey laid out what a well-resourced team could run with
            techniques that exist today. Its kill criteria are the same discipline the design's
            experiments follow.
          </p>
          <SectionView section={program} top={3} slugger={slugger} />

          <h2 className="section-title" id="scripts">
            The scripts
          </h2>
          <p className="body-text">
            As recorded, unchanged. The site's data step runs them; nothing on this site is typed in
            by hand.
          </p>
          <Code
            path="experiments/wired-layers/gen.py"
            note="generates a hardwired layer or a stored-weight MAC as Verilog"
          />
          <Code
            path="experiments/wired-layers/gen2.py"
            note="the same layer with shared partial sums"
          />
          <Code
            path="experiments/wired-layers/run.sh"
            note="synthesizes one design and prints its cell count"
          />
          <Code path="experiments/wired-layers/run2.sh" note="the same, for gen2.py's designs" />
          <Code path="experiments/spw-model/adds.py" note="the add-count model" />
          <Code path="experiments/cost-model/costmodel.py" note="the cost model" />
          <Code path="experiments/RESULTS.md" note="the recorded outputs" />

          <nav className="next-link" aria-label="Next">
            <Link href="/risks" className="card">
              <span className="kicker">Next</span>
              <h3>Risks and prior art</h3>
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
