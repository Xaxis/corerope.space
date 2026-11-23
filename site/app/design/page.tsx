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
import { StageSteps } from "@/components/StageSteps";
import { SubNav } from "@/components/SubNav";
import { Chapter, PageIntro, Pager, Q, researchHref } from "@/components/Template";
import { Stage } from "@/components/three/Stage";
import { DESIGN, docTitle, indexOf, quote, type Section, section, sourceOf } from "@/lib/content";
import { multipliers } from "@/lib/data";
import { type Invention, inventions, type Slug } from "@/lib/inventions";
import { times } from "@/lib/scale";

const tested = inventions().filter((x) => x.experiments.length > 0).length;

export const metadata: Metadata = {
  title: "The design",
  description: `The ${inventions().length} parts of the Corerope stack: the cost term each attacks, how each could fail, and, for ${tested} of them, the experiment that would falsify it.`,
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
    sentences: 2,
  },
  "context-cartridges": { label: "The budget", start: "Per user the core holds", sentences: 2 },
  "two-tier-fleet": {
    label: "The open risk",
    start: "The open risk is the hard-task share",
    sentences: 1,
  },
};

/** A bold lead-in paragraph starting with `start` and the list or table it introduces. */
function after(s: Section, start: string): Section["nodes"] {
  const i = indexOf(s, start);
  return s.nodes.slice(i, i + 2);
}

const PICK = "Show in the scene";
const ILLUSTRATION = (
  <p className="scene-note">
    An illustration of the mechanism: the counts and lengths in the scene are not data.
  </p>
);

/**
 * The sentences a part's first scene step shows under its stage, named once: the chapter's lede
 * leaves them out, so the caption does not repeat the lede a screen above it.
 */
const FIRST_STEP: Partial<Record<Slug, [start: string, sentences: number]>> = {
  "wired-ternary": ["In wired-weight silicon a weight", 2],
  "tokens-per-task": ["Cheaper tokens get spent", 2],
  "context-cartridges": ["Once weights stop moving", 1],
};

function firstStep(x: Invention) {
  const at = FIRST_STEP[x.slug];
  if (!at) throw new Error(`design: no first step named for ${x.slug}`);
  return quote(DESIGN, x.heading, ...at);
}

/** A part's opening paragraph, less what its first scene step already shows. */
function lede(x: Invention): string {
  if (!FIRST_STEP[x.slug]) return x.summary;
  const shown = firstStep(x).text;
  if (!x.summary.startsWith(shown))
    throw new Error(`design: ${x.slug}'s first step no longer opens its section`);
  return x.summary.slice(shown.length).trim() || x.summary;
}

function evidence(x: Invention): ReactNode {
  const s = x.section;
  const h = x.heading;
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
          <StageSteps
            scene="wired"
            legend={PICK}
            label="A 3D wired ternary layer: activations run down input rails, drop through +1 and -1 vias into plus and minus buses, and light the adders."
            steps={[
              {
                key: "connection",
                title: "A weight is a wire",
                body: <Q q={firstStep(x)} />,
              },
              {
                key: "shared",
                title: "Shared partial sums",
                body: <Q q={quote(DESIGN, h, "With fixed weights, every signed combination", 1)} />,
              },
              {
                key: "sparse",
                title: "A zero costs nothing",
                body: <Q q={quote(DESIGN, h, "A zero activation holds its wires still", 2)} />,
              },
            ]}
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
      return (
        <>
          <StageSteps
            scene="storage"
            legend={PICK}
            label="A 3D memory tier: tokens run along a rail toward a small core. As each one passes over a 3D NAND stack, beams drop into the stack and light the rows it will need. The rows then either cross the bus to the core one by one, or are summed on the die so that one small vector crosses. In the last step the core also makes lookups of its own into the DRAM beside it."
            steps={[
              {
                key: "naive",
                title: "Every row crosses",
                body: (
                  <p className="story-aside">
                    In the scene: a token's addresses are known as it arrives, so its rows light
                    before it reaches the core. Without help from the die, each of those rows then
                    crosses the bus on its own.
                  </p>
                ),
              },
              {
                key: "reduce",
                title: "Summed on the die",
                body: (
                  <Q q={quote(DESIGN, h, "The memory tier lives in storage that computes", 2)} />
                ),
              },
              {
                key: "levels",
                title: "Two levels",
                body: (
                  <>
                    <Q q={quote(DESIGN, h, "Engram's deterministic addressing", 1)} />
                    <p className="story-aside">
                      In the scene: contextual lookups wait for the core's hidden state, then go to
                      the DRAM beside it (blue).
                    </p>
                  </>
                ),
              },
            ]}
          />
          {ILLUSTRATION}
          <Markdown
            nodes={after(s, "Two levels, split by when the address is known.")}
            className="q-prose"
          />
        </>
      );
    case "tokens-per-task":
      return (
        <>
          <StageSteps
            scene="tokens"
            legend={PICK}
            label="A 3D chain of reasoning tokens laid in a serpentine from the task to the answer, lit one by one as they are written. Hot red tokens are the expensive steps; joule-priced training removes them, a repeated stretch folds into one compiled skill block, and runs of steps become a continuous blue ribbon of latent reasoning with white text checkpoints."
            steps={[
              {
                key: "spent",
                title: "Cheaper tokens get spent",
                body: <Q q={firstStep(x)} />,
              },
              {
                key: "joules",
                title: "Joule-priced RL",
                body: <Q q={quote(DESIGN, h, "The reward is correctness minus a price", 2)} />,
              },
              {
                key: "skills",
                title: "Compiled skills",
                body: <Q q={quote(DESIGN, h, "When the fleet solves the same sub-procedure", 1)} />,
              },
              {
                key: "latent",
                title: "Grounded latent reasoning",
                body: <Q q={quote(DESIGN, h, "The core reasons for a few steps", 1)} />,
              },
            ]}
          />
          {ILLUSTRATION}
          <TokensFigure />
          <Markdown
            nodes={[s.nodes.find((n) => n.type === "list")].filter((n) => n !== undefined)}
            className="q-prose"
          />
        </>
      );
    case "context-cartridges":
      return (
        <>
          <StageSteps
            scene="cartridges"
            legend={PICK}
            label="A 3D frozen core with an ice-blue lattice, ringed by the user's context state. First a stack of corpus pages streams into the core and the ring fills slowly. Then cartridges in a rack behind the core fly to a dock one at a time, and the ring fills at once in the cartridge's colour. Last, a session walks along a timeline, leaving snapshots at chunk boundaries, and on returning resumes from the last one."
            steps={[
              {
                key: "reread",
                title: "Re-reading the corpus",
                body: <Q q={firstStep(x)} />,
              },
              {
                key: "cartridge",
                title: "A cartridge",
                body: (
                  <Q q={quote(DESIGN, h, "A cartridge is a trained, compact starting state", 2)} />
                ),
              },
              {
                key: "snapshots",
                title: "Checkpointed prefixes",
                body: <Q q={quote(DESIGN, h, "Agent turns reuse 85 to 99%", 2)} />,
              },
            ]}
          />
          {ILLUSTRATION}
          <Markdown nodes={after(s, "What is new here.")} className="q-prose" />
        </>
      );
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
            label: "Parts of the design",
            note: `${parts.filter((x) => x.experiments.length === 0).length} still lack a falsification experiment`,
          },
        ]}
      >
        <p className="intro-status">
          <span className="pill">
            <span className="dot" aria-hidden="true" />A design, not a result
          </span>
          {quote(DESIGN, "Summary", "Nothing here is proven at scale", 1).text}
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
        source={sourceOf(where)}
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
            lede={<p className="q">{lede(x)}</p>}
            aside={
              <div className="part-risk">
                <p className="part-label">{risk.label}</p>
                <Q q={quote(DESIGN, x.heading, risk.start, risk.sentences)} />
              </div>
            }
            source={sourceOf(x.section)}
            more={{ href: researchHref(DESIGN, x.heading), label: "Read the full section" }}
          >
            {evidence(x)}
            <div className="part-test">
              <h3 className="part-label">
                {x.experiments.length > 1
                  ? "The experiments that would falsify it"
                  : "The experiment that would falsify it"}
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
