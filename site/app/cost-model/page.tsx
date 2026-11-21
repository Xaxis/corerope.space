import golden from "@data/costmodel-golden.json";
import type { Metadata } from "next";
import { AmdahlStage } from "@/components/Amdahl";
import { Calculator } from "@/components/Calculator";
import { Code } from "@/components/Code";
import { AmdahlFigure, CostBreakdownFigure, MultiplierFigure } from "@/components/figures";
import { Markdown } from "@/components/Markdown";
import { Callout } from "@/components/Page";
import { SubNav } from "@/components/SubNav";
import { Chapter, PageIntro, Pager, Q, researchHref } from "@/components/Template";
import { aroundPlaceholder, DESIGN, indexOf, part, quote, section, sourceOf } from "@/lib/content";
import { amdahl, multipliers } from "@/lib/data";
import { presets } from "@/lib/presets";
import { times } from "@/lib/scale";
import { blobUrl } from "@/lib/site";

const MODEL = "experiments/cost-model/costmodel.py";
const BUDGET = "Multiplier budget vs the late-2026 frontier";
const TRAP = "The Amdahl trap and the two-tier fleet";

export const metadata: Metadata = {
  title: "The cost model",
  description:
    "An interactive port of the Corerope cost model: change any assumption and see the energy and dollar multipliers per task and per token against the late-2026 frontier, with the Amdahl fallback cap.",
  alternates: { canonical: "/cost-model" },
};

export default function CostModel() {
  const budget = section(DESIGN, BUDGET, { withHeading: false });
  const split = aroundPlaceholder(budget);
  if (!split)
    throw new Error(
      "cost-model: the design doc's multiplier section lost its [Chart: ...] placeholder",
    );
  const dollars = indexOf(split.after, "Dollars lag energy");
  const trap = section(DESIGN, TRAP);
  const et = multipliers.rows.find((r) => r.key === "energy_task");
  const dt = multipliers.rows.find((r) => r.key === "dollars_task");
  const one = amdahl.recorded.find((r) => r.share === 0.01);

  return (
    <>
      <PageIntro
        n="04"
        kicker="The cost model"
        title="Change any assumption; see what is left of 1000x"
        lede={
          <p className="q">
            The design's cost model, running in your browser. It prices one core set against its
            throughput, adds energy, per-model NRE and memory storage, then applies tokens per task
            and the Tier B and GPU shares.
          </p>
        }
        files={[MODEL, DESIGN]}
        stats={[
          ...(et
            ? [
                {
                  value: times(et.central),
                  label: "Less energy per solved task",
                  note: `Central case; ${times(et.low)} pessimistic, ${times(et.high)} optimistic`,
                  tone: "accent" as const,
                },
              ]
            : []),
          ...(dt
            ? [
                {
                  value: times(dt.central),
                  label: "Lower cost per solved task",
                  note: `Central case; ${times(dt.low)} pessimistic, ${times(dt.high)} optimistic`,
                  tone: "accent" as const,
                },
              ]
            : []),
          ...(one
            ? [
                {
                  value: times(one.energy_x),
                  label: "With 1% of tasks on GPUs",
                  note: "Central case energy; the Amdahl trap",
                },
              ]
            : []),
        ]}
      />
      <SubNav
        label="Chapters of the cost model"
        items={[
          { id: "calculator", text: "The calculator" },
          { id: "budget", text: "The budget" },
          { id: "dollars", text: "Where the dollars go" },
          { id: "amdahl", text: "The Amdahl trap" },
          { id: "code", text: "The code" },
        ]}
      />

      <Chapter
        id="calculator"
        n="Chapter 1"
        title="Every assumption, adjustable"
        lede={
          <p className="q">
            Start from the pessimistic, central or optimistic case, then move any input. The link in
            your address bar keeps your settings, so a scenario can be shared.
          </p>
        }
      >
        <Calculator presets={{ fabric: presets("fabric"), as_written: presets("as_written") }} />
        <Callout kind="note">
          <p>
            This is{" "}
            <a href={blobUrl({ path: "site/lib/costmodel.ts" })}>a line-for-line TypeScript port</a>{" "}
            of <a href={blobUrl({ path: MODEL })}>costmodel.py</a>'s <code>run()</code>. A test
            checks it against outputs the Python wrote for {golden.vectors.length} parameter sets,
            the presets and random draws, and every output must match to the last bit. The presets
            come from the script's own <code>S</code> table, read at build time. A model of a design
            is not a measurement: each input is an assumption that an experiment would test.
          </p>
        </Callout>
      </Chapter>

      <Chapter
        id="budget"
        n="Chapter 2"
        title={BUDGET.replace(" vs ", " against ")}
        lede={<Markdown nodes={split.before.nodes} className="q-prose" />}
        source={sourceOf(budget)}
        more={{ href: researchHref(DESIGN, BUDGET), label: "Read the full section" }}
      >
        <MultiplierFigure />
        <Markdown nodes={part(split.after, 0, dollars).nodes} className="q-prose" />
      </Chapter>

      <Chapter
        id="dollars"
        n="Chapter 3"
        layout="split"
        title="Dollars lag energy"
        lede={<Markdown nodes={part(split.after, dollars).nodes} className="q-prose" />}
        source={sourceOf(budget)}
      >
        <CostBreakdownFigure />
      </Chapter>

      <Chapter
        id="amdahl"
        n="Chapter 4"
        title="The Amdahl trap"
        lede={<Q q={quote(DESIGN, TRAP, "If a share f of tasks still runs at baseline cost", 3)} />}
        source={sourceOf(trap)}
        more={{ href: researchHref(DESIGN, TRAP), label: "Read the full section" }}
      >
        <AmdahlStage />
        <AmdahlFigure />
      </Chapter>

      <Chapter
        id="code"
        n="Chapter 5"
        title="The model itself"
        lede={
          <p className="q">
            One short Python file. <code>S</code> holds each assumption's pessimistic, central and
            optimistic value; <code>run(i)</code> turns one case into multipliers. The script that
            turns its output into this site's charts is{" "}
            <a href={blobUrl({ path: "scripts/data/costmodel_data.py" })}>
              scripts/data/costmodel_data.py
            </a>
            .
          </p>
        }
      >
        <Code path={MODEL} open />
      </Chapter>

      <Pager current="/cost-model" />
    </>
  );
}
