import Link from "next/link";
import { FleetStory } from "@/components/Amdahl";
import { BudgetFigure, MultiplierFigure } from "@/components/figures";
import { StoryChapter } from "@/components/Story";
import { Chapter, ChapterFoot, Pager, Q, Stats } from "@/components/Template";
import { Stage } from "@/components/three/Stage";
import { BRIEF, DESIGN, quote, SURVEY, section, sourceOf } from "@/lib/content";
import { amdahl, decodeEnergy, leverTotal, multipliers, roadmap } from "@/lib/data";
import { inventions } from "@/lib/inventions";
import { presets } from "@/lib/presets";
import { times } from "@/lib/scale";

const lines = (heading: string, file = DESIGN) => sourceOf(section(file, heading));

export default function Home() {
  const row = (k: string) => multipliers.rows.find((r) => r.key === k);
  const et = row("energy_task");
  const dt = row("dollars_task");
  const cap = amdahl.recorded.find((r) => r.share === 0.01);
  const c = decodeEnergy.coefficients;
  const ratio = c.pj_per_hbm_bit / c.pj_per_flop;
  const where = "Where the remaining 1000x hides";
  const inv4 = section(DESIGN, "Invention 4");
  const inv6 = section(DESIGN, "Invention 6");
  const parts = inventions();
  const missing = parts.filter((x) => x.experiments.length === 0);
  // The baseline token as the cost model's cases hold it: one price, a range of joules.
  const cases = presets("fabric");
  const joules = cases.map((p) => p.base_J_per_tok);
  const price = cases[1].base_usd_per_Mtok;

  return (
    <>
      <section className="hero3d" aria-labelledby="hero-title">
        <Stage
          scene="corerope"
          param={0.3}
          className="hero3d-stage"
          label="Core rope memory in 3D: ferrite rings on a row, with wires threaded through some and looped around others. Pulses of current run down the wires, and each ring a wire threads flashes as the pulse passes: a 1. A ring the wire goes around stays dark: a 0."
        />
        <div className="wrap hero3d-content">
          <p className="kicker">
            <span className="kicker-n">01</span>An open research program
          </p>
          <h1 id="hero-title" className="hero3d-title">
            Making a frontier-quality LLM roughly 1000x cheaper to run
          </h1>
          <Q
            className="hero3d-lede"
            q={quote(DESIGN, "Summary", "The invented stack reaches about", 1)}
          />
          <p className="hero3d-status">
            <span className="pill">
              <span className="dot" aria-hidden="true" />A design, not a result
            </span>
            {quote(DESIGN, "Summary", "Nothing here is proven at scale", 1).text}
          </p>
          <div className="actions">
            <a className="btn btn-primary" href="#today">
              Read the story
            </a>
            <Link className="btn btn-ghost" href="/cost-model">
              Run the cost model
            </Link>
          </div>
        </div>
        <div className="wrap hero3d-name">
          <p>
            <b>Why “Corerope”.</b>{" "}
            {quote(BRIEF, "The name", "The Apollo Guidance Computer stored", 2).text}
          </p>
        </div>
      </section>

      <section className="numbers" aria-label="The headline numbers">
        <div className="wrap">
          <Stats
            items={[
              ...(et
                ? [
                    {
                      value: times(et.central),
                      label: "Less energy per solved task",
                      note: `Central case; range ${times(et.low)} to ${times(et.high)}`,
                      tone: "accent" as const,
                    },
                  ]
                : []),
              ...(dt
                ? [
                    {
                      value: times(dt.central),
                      label: "Lower cost per solved task",
                      note: `Central case; range ${times(dt.low)} to ${times(dt.high)}`,
                      tone: "accent" as const,
                    },
                  ]
                : []),
              {
                value: `~${times(leverTotal("b2026", "cost"))}`,
                label: "What known levers give",
                note: `Against the same late-2026 baseline, in dollars; ~${times(leverTotal("b2026", "energy"))} in energy`,
              },
              ...(cap
                ? [
                    {
                      value: times(cap.energy_x),
                      label: "If 1% of tasks fall back to GPUs",
                      note: "Why every task must stay on the new stack",
                    },
                  ]
                : []),
            ]}
          />
          <p className="numbers-note">
            Modeled by the design's cost model, not measured. {parts.length - missing.length} of the{" "}
            {parts.length} parts have an experiment that could prove them wrong.
          </p>
        </div>
      </section>

      <StoryChapter
        id="today"
        n="Chapter 1"
        title="Where a frontier token's energy goes"
        scene="memory"
        label="A 3D GPU package: the die in the middle, stacks of HBM memory beside it, and the weights streaming from memory to the die as glowing bits. In the last step the memory stacks sink away, the stream stops and the die becomes a weave of fixed wires."
        steps={[
          {
            key: "price",
            title: `A late-2026 token: $${price} per million, ${Math.min(...joules)} to ${Math.max(...joules)} J each`,
            body: <Q q={quote(DESIGN, where, "A late-2026 frontier token costs about", 2)} />,
          },
          {
            key: "bytes",
            title: "Most of it moves weights, not math",
            body: (
              <>
                <Q q={quote(DESIGN, where, "An H100 spends", 1)} />
                <div
                  className="compare"
                  role="img"
                  aria-label={`${c.pj_per_hbm_bit} pJ to move a bit from HBM against ${c.pj_per_flop} pJ per operation: about ${Math.round(ratio)} times more.`}
                >
                  <div className="compare-row">
                    <span>Move one bit from HBM</span>
                    <span className="compare-bar hot" style={{ width: "100%" }} />
                    <b>{c.pj_per_hbm_bit} pJ</b>
                  </div>
                  <div className="compare-row">
                    <span>One tensor-core operation</span>
                    <span
                      className="compare-bar"
                      style={{ width: `${(100 * c.pj_per_flop) / c.pj_per_hbm_bit}%` }}
                    />
                    <b>{c.pj_per_flop} pJ</b>
                  </div>
                  <p className="compare-note">
                    About {Math.round(ratio)}x (derived). Every weight crosses that gap for every
                    use.
                  </p>
                </div>
              </>
            ),
          },
          {
            key: "floor",
            title: "Physics is not the limit; architecture is",
            body: (
              <>
                <Q q={quote(DESIGN, where, "An 8-bit digital adder", 2)} />
                <p className="story-aside">
                  In the scene: freeze the weights into the die as wiring, and the stream stops. A
                  weight that is a wire is never fetched.
                </p>
              </>
            ),
          },
        ]}
        foot={
          <ChapterFoot
            source={lines(where)}
            more={{ href: "/survey", label: "The baseline, in the survey" }}
          />
        }
      />

      <Chapter
        id="levers"
        n="Chapter 2"
        title={`Why the known levers stall at about ${times(leverTotal("b2026", "cost"))}`}
        lede={
          <>
            <Q q={quote(SURVEY, "", "A roughly 1000x cut in cost and energy per solved task", 1)} />
            <Q q={quote(SURVEY, "Honest odds", "Against B2026 at late-2026 frontier quality", 2)} />
          </>
        }
        source={lines("Honest odds", SURVEY)}
        more={{ href: "/survey#budget", label: "Every lever, measured" }}
      >
        <Stats
          items={[
            {
              value: `~${times(leverTotal("b2024", "cost"))}`,
              label: "Against 2024, in dollars",
              note: `~${times(leverTotal("b2024", "energy"))} in energy`,
            },
            {
              value: `~${times(leverTotal("b2026", "cost"))}`,
              label: "Against late 2026, in dollars",
              note: `~${times(leverTotal("b2026", "energy"))} in energy`,
              tone: "accent",
            },
          ]}
        />
        <BudgetFigure />
      </Chapter>

      <StoryChapter
        id="wires"
        n="Chapter 3"
        title="Weights become wires"
        scene="wired"
        label="A 3D wired ternary layer: input rails, and for each output a plus bus and a minus bus ending in an adder. Vias connect rails to the plus bus (+1, copper) or the minus bus (-1, blue), or nothing (0). Activations run down the rails, drop through the vias and light the adders."
        steps={[
          {
            key: "connection",
            title: "A weight is a connection, not a number",
            body: <Q q={quote(DESIGN, "Invention 2", "In wired-weight silicon a weight", 2)} />,
          },
          {
            key: "shared",
            title: "Build each partial sum once",
            body: (
              <>
                <Q
                  q={quote(
                    DESIGN,
                    "Invention 2",
                    "With fixed weights, every signed combination",
                    1,
                  )}
                />
                <Q q={quote(DESIGN, "Invention 2", "A synthesis test found", 1)} />
              </>
            ),
          },
          {
            key: "sparse",
            title: "A zero costs nothing",
            body: (
              <Q q={quote(DESIGN, "Invention 2", "A zero activation holds its wires still", 3)} />
            ),
          },
        ]}
        foot={
          <ChapterFoot
            source={lines("Invention 2")}
            more={{ href: "/design#wired-ternary", label: "Wired-weight ternary silicon, in full" }}
          />
        }
      />

      <FleetStory
        id="fleet"
        n="Chapter 4"
        title="Knowledge moves out; every task stays on"
        steps={[
          {
            key: "split",
            title: "A small core that reasons, a vast memory that knows",
            body: (
              <>
                <Q q={quote(DESIGN, "Invention 1", "The split mind stores knowledge", 2)} />
                <Q q={quote(DESIGN, "Invention 1", "Roughly 2 MB of memory read per token", 2)} />
              </>
            ),
          },
          {
            key: "tiers",
            title: "Two tiers, both wired",
            body: (
              <Q q={quote(DESIGN, "The Amdahl trap", "Tier B is the same design scaled up", 3)} />
            ),
          },
          {
            key: "trap",
            title: "The Amdahl trap",
            body: (
              <Q
                q={quote(
                  DESIGN,
                  "The Amdahl trap",
                  "If a share f of tasks still runs at baseline cost",
                  3,
                )}
              />
            ),
          },
        ]}
        foot={
          <ChapterFoot
            source={lines("The Amdahl trap")}
            more={{ href: "/design#two-tier-fleet", label: "The two-tier fleet, in full" }}
          />
        }
      />

      <StoryChapter
        id="moves"
        n="Chapter 5"
        title="What still moves once the weights are wires"
        scene="storage"
        label="A 3D memory tier: tokens run toward a small core, the rows each one needs light up inside a 3D NAND stack, the die sums them, and one small vector crosses to the core."
        steps={[
          {
            key: "lookups",
            title: "Memory that computes where it is stored",
            body: (
              <>
                <Q
                  q={quote(
                    DESIGN,
                    "Invention 4",
                    "The memory tier lives in storage that computes",
                    2,
                  )}
                />
                <p className="story-aside">
                  In the scene: a token's addresses are known as it arrives, so the rows it needs
                  light up before it reaches the core; the die sums them and one vector crosses.
                </p>
              </>
            ),
            scene: {
              name: "storage",
              step: 1,
              label:
                "A 3D memory tier: tokens run toward a small core, the rows each one needs light up inside a 3D NAND stack, the die sums them, and one small vector crosses to the core.",
            },
          },
          {
            key: "cartridges",
            title: "Context loaded in one step, not re-read",
            body: (
              <>
                <Q q={quote(DESIGN, "Invention 6", "Once weights stop moving", 1)} />
                <Q
                  q={quote(
                    DESIGN,
                    "Invention 6",
                    "A cartridge is a trained, compact starting state",
                    2,
                  )}
                />
              </>
            ),
            scene: {
              name: "cartridges",
              step: 1,
              label:
                "A 3D frozen core ringed by the user's context state. Cartridges in a rack behind it fly to a slot one at a time, and the ring fills at once in the cartridge's colour.",
            },
          },
          {
            key: "tokens",
            title: "Fewer tokens per solved task",
            body: (
              <>
                <Q q={quote(DESIGN, "Invention 5", "Cheaper tokens get spent", 2)} />
                <p className="story-aside">
                  In the scene: joule-priced training prunes the costly steps (red), a stretch the
                  fleet solves again and again becomes one compiled skill (the green block), and
                  runs of steps become latent reasoning (blue) that must end in a short text
                  checkpoint (white).
                </p>
              </>
            ),
            scene: {
              name: "tokens",
              step: 3,
              label:
                "A 3D chain of reasoning tokens from a task to its answer, shortened: the expensive steps pruned, a repeated stretch folded into one compiled skill block, and runs of steps turned into a blue ribbon of latent reasoning with white text checkpoints.",
            },
          },
        ]}
        foot={
          <ChapterFoot
            source={{ path: DESIGN, startLine: inv4.startLine, endLine: inv6.endLine }}
            more={{ href: "/design#lookup-in-storage", label: "The three parts, in full" }}
          />
        }
      />

      <Chapter
        id="numbers"
        n="Chapter 6"
        title="The numbers, and how sure they are"
        lede={
          <>
            <Q q={quote(DESIGN, "Multiplier budget", "In the central case the stack is", 2)} />
            <Q
              q={quote(
                DESIGN,
                "Multiplier budget",
                "Dollars lag energy because capital dominates",
                2,
              )}
            />
          </>
        }
        source={lines("Multiplier budget")}
        more={{ href: "/cost-model", label: "Change any assumption in the cost model" }}
      >
        <MultiplierFigure />
      </Chapter>

      <Chapter
        id="tests"
        n="Chapter 7"
        title="What would prove it wrong"
        lede={
          <Q
            q={quote(DESIGN, "Experiments:", "This session tested only the silicon arithmetic", 3)}
          />
        }
        source={lines("Experiments:")}
        more={{ href: "/experiments", label: "The experiments and the risks" }}
      >
        <ol className="exp-list">
          {roadmap.experiments.map((e) => (
            <li key={e.order}>
              <span className="exp-list-n">{e.order}</span>
              <div>
                <p className="exp-list-what">{e.experiment}</p>
                <p className="exp-list-bar">
                  <b>Pass bar:</b> {e.pass_bar}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="exp-list-note">
          {roadmap.experiments.length} experiments, ordered so the cheapest decisive ones run first.{" "}
          {missing.length} parts of the design have none yet (
          {missing.map((x) => x.number).join(" and ")}); the design page marks them.
        </p>
      </Chapter>

      <Pager current="/" />
    </>
  );
}
