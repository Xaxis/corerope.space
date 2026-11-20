import Link from "next/link";
import { CoreRope } from "@/components/CoreRope";
import { MultiplierFigure } from "@/components/figures";
import { HeroRope } from "@/components/HeroRope";
import { Markdown } from "@/components/Markdown";
import { Callout } from "@/components/Page";
import { SourceLink } from "@/components/SourceLink";
import { firstParagraph, indexOf, lead, part, section, upTo } from "@/lib/content";
import { amdahl, levers, multipliers } from "@/lib/data";
import { DESIGN } from "@/lib/inventions";
import { times } from "@/lib/scale";

const SURVEY = "research/01-report-path-to-1000x.md";
const BRIEF = "00-BRIEF.md";

export default function Home() {
  const summary = section(DESIGN, "Summary", { withHeading: false });
  const listAt = summary.nodes.findIndex((n) => n.type === "list");
  const opening = part(summary, 0, 1);
  const parts = part(summary, listAt - 1, listAt + 1);
  const status = part(summary, indexOf(summary, "Nothing here is proven"));
  const name = section(BRIEF, "The name", { withHeading: false });
  // The brief's story of the name, without the instructions about it that follow in the same paragraph.
  const storyNode = name.nodes[0];
  const story = storyNode ? upTo(storyNode, "Use this story") : undefined;
  const row = (k: string) => multipliers.rows.find((r) => r.key === k);
  const et = row("energy_task");
  const dt = row("dollars_task");
  const b26 = levers.budgets.b2026.rows.filter((r) => r.kind === "total" && !r.naive);
  const b24 = levers.budgets.b2024.rows.filter((r) => r.kind === "total" && !r.naive);
  const total = (rows: typeof b26, what: string) =>
    rows.find((r) => r.label.includes(what))?.central;
  const b26cost = b26.find((r) => r.label.includes("cost"));
  const b26energy = b26.find((r) => r.label.includes("energy"));
  const cap = amdahl.recorded.find((r) => r.share === 0.01);
  const surveyLead = firstParagraph(lead(SURVEY)).split(/(?<=\.)\s/)[0];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-text">
            <p className="eyebrow">An open research program</p>
            <h1 className="hero-title">
              Making a frontier-quality LLM roughly 1000x cheaper to run
            </h1>
            <div className="hero-lede">
              <Markdown nodes={opening.nodes} className="lede-prose" />
            </div>
            <div className="hero-status">
              <span className="pill">
                <span className="dot" aria-hidden="true" />
                Status: a design, not a result
              </span>
              <span className="hero-status-text">
                <Markdown nodes={status.nodes} className="inline-prose" />
              </span>
            </div>
            <div className="actions">
              <Link className="btn btn-primary" href="/design">
                See the design
              </Link>
              <Link className="btn" href="/cost-model">
                Run the cost model
              </Link>
              <Link className="btn" href="/research">
                Read the research
              </Link>
            </div>
            <SourceLink path={DESIGN} startLine={summary.startLine} endLine={summary.endLine} />
          </div>
          <HeroRope />
        </div>
      </section>

      <section className="band" aria-labelledby="numbers">
        <div className="wrap">
          <h2 className="band-title" id="numbers">
            The numbers, and how sure they are
          </h2>
          <p className="band-lede">
            The design's cost model against a late-2026 frontier deployment (B2026), beside what the
            survey found every known lever can do against the same baseline.
          </p>
          <div className="stats">
            {et && (
              <div className="stat accent">
                <p className="label">Less energy per solved task, central case</p>
                <p className="value">{times(et.central)}</p>
                <p className="foot">
                  Range {times(et.low)} to {times(et.high)}. Modeled, not measured.
                </p>
              </div>
            )}
            {dt && (
              <div className="stat accent">
                <p className="label">Lower cost per solved task, central case</p>
                <p className="value">{times(dt.central)}</p>
                <p className="foot">
                  Range {times(dt.low)} to {times(dt.high)}. Modeled, not measured.
                </p>
              </div>
            )}
            {b26cost && b26energy && (
              <div className="stat">
                <p className="label">What the known levers give against B2026, central</p>
                <p className="value">
                  ~{times(b26cost.central)}
                  <small> in dollars</small>
                </p>
                <p className="foot">
                  ~{times(b26energy.central)} in energy. The survey's overlap-adjusted estimate.
                </p>
              </div>
            )}
            {cap && (
              <div className="stat">
                <p className="label">Gain per task if 1% of tasks fall back to GPUs</p>
                <p className="value">{times(cap.energy_x)}</p>
                <p className="foot">Why every task must stay on the new stack.</p>
              </div>
            )}
          </div>
          <MultiplierFigure />
        </div>
      </section>

      <section className="band" aria-labelledby="name">
        <div className="wrap">
          <p className="eyebrow">The name</p>
          <h2 className="band-title" id="name">
            Weights woven into the hardware
          </h2>
          {story && <Markdown nodes={[story]} className="band-prose" />}
          <CoreRope />
          <SourceLink
            path={BRIEF}
            startLine={storyNode?.position?.start.line}
            endLine={storyNode?.position?.end.line}
          />
        </div>
      </section>

      <section className="band" aria-labelledby="layers">
        <div className="wrap">
          <h2 className="band-title" id="layers">
            Two layers: a survey of what exists, and a design for what does not
          </h2>
          <div className="cards two">
            <Link className="card card-lg" href="/levers">
              <span className="kicker">The survey</span>
              <h3>Stacked levers reach 1000x only against 2024</h3>
              <p>{surveyLead}</p>
              <table className="mini">
                <caption className="visually-hidden">
                  The survey's overlap-adjusted central estimates, per solved task
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Central estimate, per solved task</th>
                    <th scope="col">Dollars</th>
                    <th scope="col">Energy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Against B2024 (dense 405B, H100)</th>
                    <td>~{times(total(b24, "cost") ?? 0)}</td>
                    <td>~{times(total(b24, "energy") ?? 0)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Against B2026 (late-2026 frontier)</th>
                    <td>~{times(total(b26, "cost") ?? 0)}</td>
                    <td>~{times(total(b26, "energy") ?? 0)}</td>
                  </tr>
                </tbody>
              </table>
              <span className="more">The baseline and the levers</span>
            </Link>
            <Link className="card card-lg" href="/design">
              <span className="kicker">The design</span>
              <h3>Seven inventions for the gap the levers cannot close</h3>
              <Markdown nodes={parts.nodes} className="card-prose" />
              <span className="more">The design, part by part</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="explore">
        <div className="wrap">
          <h2 className="band-title" id="explore">
            Where to go next
          </h2>
          <div className="cards">
            {[
              {
                href: "/baseline",
                k: "1",
                t: "The baseline",
                d: "Why the unit is dollars and joules per solved task, and why 2024 and 2026 give different answers.",
              },
              {
                href: "/levers",
                k: "2",
                t: "The levers",
                d: "Every known efficiency lever as of November 2026: its measured gain, its quality cost, and what it overlaps.",
              },
              {
                href: "/design",
                k: "3",
                t: "The design",
                d: "Each invention, the cost term it attacks, and the experiment that would falsify it.",
              },
              {
                href: "/cost-model",
                k: "4",
                t: "The cost model",
                d: "Every assumption as a slider, running the same arithmetic as costmodel.py.",
              },
              {
                href: "/experiments",
                k: "5",
                t: "Experiments",
                d: "What was synthesized and modeled, re-run for this site, and the seven experiments to run next.",
              },
              {
                href: "/risks",
                k: "6",
                t: "Risks and prior art",
                d: "What could kill the design, the gaps in the evidence, and the work it builds on.",
              },
            ].map((c) => (
              <Link className="card" href={c.href} key={c.href}>
                <span className="num">{c.k}</span>
                <h3>{c.t}</h3>
                <p>{c.d}</p>
              </Link>
            ))}
          </div>
          <Callout kind="note">
            <p>
              Every number on this site is read from the research files or produced by the scripts
              in the repository. Each chart links to its data and the script that made it; each page
              links to the lines it renders.
            </p>
          </Callout>
        </div>
      </section>
    </>
  );
}
