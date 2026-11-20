import Link from "next/link";
import { FleetStory } from "@/components/Amdahl";
import { BudgetFigure, MultiplierFigure } from "@/components/figures";
import { StoryChapter } from "@/components/Story";
import { Chapter, ChapterFoot, Pager, Q, Stats } from "@/components/Template";
import { Stage } from "@/components/three/Stage";
import { quote, section } from "@/lib/content";
import { amdahl, decodeEnergy, levers, multipliers, roadmap } from "@/lib/data";
import { DESIGN, inventions } from "@/lib/inventions";
import { times } from "@/lib/scale";

const SURVEY = "research/01-report-path-to-1000x.md";
const BRIEF = "00-BRIEF.md";

function lines(heading: string, file = DESIGN) {
  const s = section(file, heading);
  return { path: file, startLine: s.startLine, endLine: s.endLine };
}

export default function Home() {
  const row = (k: string) => multipliers.rows.find((r) => r.key === k);
  const et = row("energy_task");
  const dt = row("dollars_task");
  const cap = amdahl.recorded.find((r) => r.share === 0.01);
  const total = (b: "b2024" | "b2026", what: string) =>
    levers.budgets[b].rows.find((r) => r.kind === "total" && !r.naive && r.label.includes(what))
      ?.central;
  const c = decodeEnergy.coefficients;
  const ratio = c.pj_per_hbm_bit / c.pj_per_flop;
  const where = "Where the remaining 1000x hides";
  const missing = inventions().filter((x) => x.experiments.length === 0);

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
            {quote(DESIGN, "Summary", "Nothing here is proven at scale", 2).text}
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
                value: `~${times(total("b2026", "cost") ?? 0)}`,
                label: "What known levers give",
                note: `Against the same late-2026 baseline, in dollars; ~${times(total("b2026", "energy") ?? 0)} in energy`,
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
            Modeled by the design's cost model, not measured. Every part has an experiment that
            could prove it wrong.
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
            title: "A late-2026 token: $0.12 per million, 0.5 to 2 J each",
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
        title="Why the known levers stall at about 35x"
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
              value: `~${times(total("b2024", "cost") ?? 0)}`,
              label: "Against 2024, in dollars",
              note: `~${times(total("b2024", "energy") ?? 0)} in energy`,
            },
            {
              value: `~${times(total("b2026", "cost") ?? 0)}`,
              label: "Against late 2026, in dollars",
              note: `~${times(total("b2026", "energy") ?? 0)} in energy`,
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

      <Chapter
        id="numbers"
        n="Chapter 5"
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
        n="Chapter 6"
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
                  <b>Passes if</b> {e.pass_bar.charAt(0).toLowerCase() + e.pass_bar.slice(1)}
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
