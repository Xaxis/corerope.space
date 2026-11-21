// The design's seven parts, as its sections lay them out: six numbered inventions plus the two-tier
// fleet. Titles and summaries are read from research/02-corerope-design.md; only the URL slugs and
// the order and the short labels for navigation are set here.
import { DESIGN, firstParagraph, type Section, section } from "./content";
import { roadmap } from "./data";

const LIST = [
  { slug: "split-mind", prefix: "Invention 1:", short: "Split mind" },
  { slug: "wired-ternary", prefix: "Invention 2:", short: "Wired ternary" },
  { slug: "rom-core", prefix: "Invention 3:", short: "ROM core" },
  { slug: "lookup-in-storage", prefix: "Invention 4:", short: "Lookup in storage" },
  { slug: "tokens-per-task", prefix: "Invention 5:", short: "Tokens per task" },
  { slug: "context-cartridges", prefix: "Invention 6:", short: "Cartridges" },
  { slug: "two-tier-fleet", prefix: "The Amdahl trap", short: "Two-tier fleet" },
] as const;

/** A part's short label, for navigation and links. */
export function shortName(slug: string): string {
  return LIST.find((x) => x.slug === slug)?.short ?? slug;
}

export type Slug = (typeof LIST)[number]["slug"];
export type Experiment = (typeof roadmap.experiments)[number];

export type Invention = {
  slug: Slug;
  /** "Invention 2", or "Part 7" for the fleet. */
  number: string;
  /** The heading without its "Invention N:" prefix. */
  name: string;
  /** A label short enough for a navigation chip. */
  short: string;
  heading: string;
  summary: string;
  section: Section;
  experiments: Experiment[];
};

export function inventions(): Invention[] {
  return LIST.map((x, i) => {
    const s = section(DESIGN, x.prefix);
    const m = /^Invention (\d+):\s*(.*)$/.exec(s.title);
    return {
      slug: x.slug,
      number: m ? `Invention ${m[1]}` : `Part ${i + 1}`,
      name: m ? (m[2] ?? s.title) : s.title,
      short: x.short,
      heading: s.title,
      summary: firstParagraph(s),
      section: s,
      experiments: roadmap.experiments.filter((e) => e.inventions.includes(x.slug)),
    };
  });
}

/** The experiment that measures the energy per weight-operation, the design's least-tested input. */
export function wireExperiment(): Experiment {
  const e = roadmap.experiments.find((x) => /pJ per weight-operation/.test(x.tests));
  if (!e) throw new Error("inventions: no experiment tests the energy per weight-operation");
  return e;
}
