import GithubSlugger from "github-slugger";
import type { Metadata } from "next";
import Link from "next/link";
import { Code } from "@/components/Code";
import { ExperimentCard } from "@/components/ExperimentCard";
import { GatesFigure, SpwFigure } from "@/components/figures";
import { Markdown, SectionView } from "@/components/Markdown";
import { Callout } from "@/components/Page";
import { SubNav } from "@/components/SubNav";
import { Chapter, PageIntro, Pager, researchHref, Stats } from "@/components/Template";
import { DOCS, docTitle, part, section, sectionsNamed } from "@/lib/content";
import { gates, multipliers, roadmap, spw } from "@/lib/data";
import { DESIGN, inventions } from "@/lib/inventions";
import { times } from "@/lib/scale";
import { blobUrl } from "@/lib/site";

const RESULTS = "experiments/RESULTS.md";
const SURVEY = "research/01-report-path-to-1000x.md";
const BRIEF = "00-BRIEF.md";
const TESTS = "Experiments: what was tested, and what to run next";
const KILL = "What could kill it";
const PRIOR = "Prior art and sources";

export const metadata: Metadata = {
  title: "Experiments and risks",
  description:
    "What the Corerope research tested and this site re-runs, the seven experiments that would confirm or kill the design, what could kill it, the known gaps in the evidence, and the prior art.",
  alternates: { canonical: "/experiments" },
};

const SCRIPTS = [
  {
    path: "experiments/wired-layers/gen.py",
    note: "generates a hardwired layer or a stored-weight MAC as Verilog",
  },
  { path: "experiments/wired-layers/gen2.py", note: "the same layer with shared partial sums" },
  {
    path: "experiments/wired-layers/run.sh",
    note: "synthesizes one design and prints its cell count",
  },
  { path: "experiments/wired-layers/run2.sh", note: "the same, for gen2.py's designs" },
  { path: "experiments/spw-model/adds.py", note: "the add-count model" },
  { path: "experiments/cost-model/costmodel.py", note: "the cost model" },
  { path: "experiments/RESULTS.md", note: "the recorded outputs" },
];

export default function Experiments() {
  const tests = section(DESIGN, TESTS, { withHeading: false });
  const kill = section(DESIGN, KILL, { withHeading: false });
  const gaps = section(BRIEF, "Known gaps to flag on the site", { withHeading: false });
  const program = section(SURVEY, "A ranked, four-phase program");
  const prior = section(DESIGN, PRIOR, { withHeading: false });
  const notes = DOCS.filter((d) => d.kind === "note");
  const et = multipliers.rows.find((r) => r.key === "energy_task");
  const missing = inventions().filter((x) => x.experiments.length === 0);
  const gapItems = gaps.nodes
    .filter((n) => n.type === "list")
    .flatMap((l) => (l.type === "list" ? l.children : []));
  const src = (path: string, s: { startLine: number; endLine: number }) => ({
    path,
    startLine: s.startLine,
    endLine: s.endLine,
  });
  // Headings rendered inside chapters get ids from one slugger, after the chapter ids are taken.
  const slugger = new GithubSlugger();
  for (const id of ["run", "roadmap", "risks", "gaps", "open", "program", "prior", "scripts"])
    slugger.slug(id);

  return (
    <>
      <PageIntro
        n="05"
        kicker="Experiments and risks"
        title={TESTS}
        lede={<Markdown nodes={part(tests, 0, 1).nodes} className="q-prose" />}
        files={[DESIGN, RESULTS, BRIEF]}
        stats={[
          {
            value: String(roadmap.experiments.length),
            label: "Experiments that would decide it",
            note: "Ordered so the cheapest decisive ones run first",
            tone: "accent",
          },
          {
            value: "0",
            label: "Model-quality claims tested",
            note: "Only the silicon arithmetic has been run",
          },
          {
            value: String(missing.length),
            label: "Parts with no experiment yet",
            note: missing.map((x) => x.name.split(",")[0]).join(" and "),
          },
        ]}
      />
      <SubNav
        label="Chapters of the experiments page"
        items={[
          { id: "run", text: "What was run" },
          { id: "roadmap", text: "What to run next" },
          { id: "risks", text: "What could kill it" },
          { id: "gaps", text: "Known gaps" },
          { id: "open", text: "Open questions" },
          { id: "program", text: "The GPU program" },
          { id: "prior", text: "Prior art" },
          { id: "scripts", text: "The scripts" },
        ]}
      />

      <Chapter
        id="run"
        n="Chapter 1"
        title="What was run, and re-run for this site"
        lede={
          <p className="q">
            Three pieces of arithmetic about the silicon, recorded in{" "}
            <a href={blobUrl({ path: RESULTS })}>RESULTS.md</a>. This site's build pipeline runs all
            three again from the scripts in the repository and checks the output against the record.
          </p>
        }
        source={{ path: RESULTS }}
      >
        <Stats
          items={[
            {
              value: gates.reproduced,
              label: `Wired-layer gate counts, Yosys ${gates.yosys}`,
              note: "Designs whose cell count matches the recorded one exactly",
            },
            {
              value: spw.matches_recorded ? "All match" : "Differ",
              label: "Shared partial-sum add counts",
              note: "Every ratio for the four layer shapes, to two decimals",
            },
            {
              value: "Exact",
              label: "Cost model, three cases and the Amdahl sweep",
              note: `Central case ${et ? times(et.central) : ""} energy per task, as recorded; the TypeScript port matches to the last bit`,
            },
          ]}
        />
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
            fully spatial designs, and Yosys ran without ABC logic optimization. Experiment 1 below
            is the measurement that would settle it.
          </p>
        </Callout>
      </Chapter>

      <Chapter
        id="roadmap"
        n="Chapter 2"
        title="Seven experiments, cheapest decisive first"
        lede={
          <p className="q">
            Each one confirms or kills a part of the design. Nothing about model quality has been
            tested yet; experiments 2 to 6 are where that happens.
          </p>
        }
        source={{ path: DESIGN, startLine: roadmap.line, endLine: tests.endLine }}
        more={{ href: researchHref(DESIGN, TESTS), label: "Read the full section" }}
      >
        <div className="exps">
          {roadmap.experiments.map((e) => (
            <ExperimentCard key={e.order} e={e} />
          ))}
        </div>
      </Chapter>

      <Chapter
        id="risks"
        n="Chapter 3"
        title={KILL}
        lede={<Markdown nodes={part(kill, 0, 1).nodes} className="q-prose" />}
        source={src(DESIGN, kill)}
        more={{ href: researchHref(DESIGN, KILL), label: "Read the full section" }}
      >
        <SectionView section={part(kill, 1)} slugger={slugger} source={false} />
      </Chapter>

      <Chapter
        id="gaps"
        n="Chapter 4"
        title="Known gaps in the evidence"
        lede={
          <p className="q">
            The brief lists what the evidence does not yet show. Each gap, as written:
          </p>
        }
        source={src(BRIEF, gaps)}
      >
        <div className="gaps">
          {gapItems.map((item) => (
            <Callout kind="gap" key={item.position?.start.line}>
              <Markdown nodes={item.children} className="inline-prose" />
            </Callout>
          ))}
        </div>
      </Chapter>

      <Chapter
        id="open"
        n="Chapter 5"
        title="What the notes could not find"
        lede={
          <p className="q">
            Each research note ends every question with its gaps: what the sources did not measure,
            or what this research could not verify. They are collected here, unedited.
          </p>
        }
      >
        <div>
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
        </div>
      </Chapter>

      <Chapter
        id="program"
        n="Chapter 6"
        title="The survey's program, for GPUs"
        lede={
          <p className="q">
            Before the design, the survey laid out what a well-resourced team could run with
            techniques that exist today. Its kill criteria are the same discipline the design's
            experiments follow.
          </p>
        }
        source={src(SURVEY, program)}
        more={{ href: researchHref(SURVEY, program.title), label: "Read the full section" }}
      >
        <SectionView section={part(program, 1)} top={3} slugger={slugger} source={false} />
      </Chapter>

      <Chapter
        id="prior"
        n="Chapter 7"
        title={PRIOR}
        source={src(DESIGN, prior)}
        more={{ href: "/research#sources", label: "Every source the research cites" }}
      >
        <SectionView section={prior} slugger={slugger} source={false} />
      </Chapter>

      <Chapter
        id="scripts"
        n="Chapter 8"
        title="The scripts"
        lede={
          <p className="q">
            As recorded, unchanged. The site's data step runs them; nothing on this site is typed in
            by hand.
          </p>
        }
      >
        <div>
          {SCRIPTS.map((s) => (
            <Code key={s.path} path={s.path} note={s.note} />
          ))}
        </div>
      </Chapter>

      <Pager current="/experiments" />
    </>
  );
}
