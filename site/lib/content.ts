// The research files, parsed once at build time, and the sections the pages are made of.
//
// The site never rewrites the research: a page is a list of sections cut from these files at their
// headings, rendered as written (components/Markdown.tsx), each with a link to the exact lines it
// came from. If a heading a page asks for disappears, the build fails here rather than publishing a
// page with a hole in it.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Heading, Root, RootContent } from "mdast";
import { toString as mdToString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/** The repository root. The site builds from site/, with the research beside it. */
export const REPO_ROOT = (() => {
  for (const dir of [path.resolve(process.cwd(), ".."), process.cwd()]) {
    if (existsSync(path.join(dir, "research")) && existsSync(path.join(dir, "data"))) return dir;
  }
  throw new Error(
    `content: no research/ beside ${process.cwd()}; build from site/ in the repository`,
  );
})();

export type DocKind = "survey" | "design" | "note" | "results";

export type Doc = {
  slug: string;
  file: string;
  kind: DocKind;
  /** A short name for lists and breadcrumbs. */
  short: string;
};

/** Every research document the site renders in full, at /research/<slug>. */
export const DOCS: Doc[] = [
  {
    slug: "path-to-1000x",
    file: "research/01-report-path-to-1000x.md",
    kind: "survey",
    short: "The survey",
  },
  {
    slug: "corerope-design",
    file: "research/02-corerope-design.md",
    kind: "design",
    short: "The design",
  },
  {
    slug: "quantization-numerics",
    file: "research/notes/quantization_numerics.md",
    kind: "note",
    short: "Low-bit numerics",
  },
  {
    slug: "moe-conditional-compute",
    file: "research/notes/moe_conditional_compute.md",
    kind: "note",
    short: "MoE and conditional compute",
  },
  {
    slug: "attention-kv-cache",
    file: "research/notes/attention_kv_cache.md",
    kind: "note",
    short: "Attention and KV cache",
  },
  {
    slug: "decoding-test-time",
    file: "research/notes/decoding_test_time.md",
    kind: "note",
    short: "Decoding and test-time compute",
  },
  {
    slug: "distillation-cost-trends",
    file: "research/notes/distillation_cost_trends.md",
    kind: "note",
    short: "Distillation and cost trends",
  },
  {
    slug: "hardware-systems",
    file: "research/notes/hardware_systems.md",
    kind: "note",
    short: "Hardware and serving",
  },
  { slug: "results", file: "experiments/RESULTS.md", kind: "results", short: "Recorded results" },
];

export function docBySlug(slug: string): Doc {
  const d = DOCS.find((x) => x.slug === slug);
  if (!d) throw new Error(`content: no document ${slug}`);
  return d;
}

export function docByFile(file: string): Doc | undefined {
  return DOCS.find((x) => x.file === file);
}

const cache = new Map<string, Root>();

/** A file of the repository, read as text. */
export function readRepo(file: string): string {
  return readFileSync(path.join(REPO_ROOT, file), "utf8");
}

/** A research file's Markdown tree (GitHub-flavored: tables, autolinks). */
export function parse(file: string): Root {
  let tree = cache.get(file);
  if (!tree) {
    tree = unified().use(remarkParse).use(remarkGfm).parse(readRepo(file)) as Root;
    cache.set(file, tree);
  }
  return tree;
}

/** A run of a file's top-level nodes, and the lines it spans. */
export type Section = {
  file: string;
  title: string;
  heading?: Heading;
  nodes: RootContent[];
  startLine: number;
  endLine: number;
};

function lines(file: string, nodes: RootContent[]): { startLine: number; endLine: number } {
  const first = nodes[0]?.position?.start.line;
  const last = nodes.at(-1)?.position?.end.line;
  if (first === undefined || last === undefined)
    throw new Error(`content: ${file}: section without positions`);
  return { startLine: first, endLine: last };
}

/** The document's title: the text of its first-level heading. */
export function docTitle(file: string): string {
  const h = parse(file).children.find((n): n is Heading => n.type === "heading" && n.depth === 1);
  if (!h) throw new Error(`content: ${file} has no # heading`);
  return mdToString(h);
}

/**
 * The section of `file` under the heading whose text starts with `prefix` (exactly one must), up to
 * the next heading of the same or a higher level. With `withHeading: false` the heading itself is
 * left out, for pages that set their own.
 */
export function section(
  file: string,
  prefix: string,
  opts: { withHeading?: boolean } = {},
): Section {
  const children = parse(file).children;
  const hits = children
    .map((n, i) => [n, i] as const)
    .filter(([n]) => n.type === "heading" && mdToString(n).startsWith(prefix));
  if (hits.length !== 1) {
    throw new Error(
      `content: ${file}: ${hits.length} headings start with "${prefix}", need exactly one`,
    );
  }
  const [heading, at] = hits[0] as readonly [Heading, number];
  let end = at + 1;
  while (end < children.length) {
    const n = children[end] as RootContent;
    if (n.type === "heading" && n.depth <= heading.depth) break;
    end++;
  }
  const body = children.slice(at + 1, end);
  const nodes = opts.withHeading === false ? body : children.slice(at, end);
  return {
    file,
    title: mdToString(heading),
    heading,
    nodes,
    ...lines(file, children.slice(at, end)),
  };
}

/** Everything before the first second-level heading, without the # title: the document's lead. */
export function lead(file: string): Section {
  const children = parse(file).children;
  const stop = children.findIndex((n) => n.type === "heading" && n.depth === 2);
  const nodes = children
    .slice(0, stop === -1 ? children.length : stop)
    .filter((n) => !(n.type === "heading" && n.depth === 1));
  if (nodes.length === 0) {
    // No lead: the document goes straight from its title to its first section.
    const at = children[0]?.position?.start.line ?? 1;
    return { file, title: docTitle(file), nodes, startLine: at, endLine: at };
  }
  return { file, title: docTitle(file), nodes, ...lines(file, nodes) };
}

/** A paragraph that says what a document is: its lead, or else its first takeaway. */
export function summaryOf(file: string): string {
  const fromLead = firstParagraph(lead(file));
  if (fromLead) return fromLead;
  const t = sectionsNamed(file, "Takeaway")[0];
  return t ? firstParagraph(t) : "";
}

/** The whole document, title excluded. */
export function whole(file: string): Section {
  const nodes = parse(file).children.filter((n) => !(n.type === "heading" && n.depth === 1));
  return { file, title: docTitle(file), nodes, ...lines(file, nodes) };
}

/** The subsections of a section at the next heading level down, each with its own lines. */
export function subsections(s: Section): Section[] {
  const depth = (s.heading?.depth ?? 1) + 1;
  const out: Section[] = [];
  let current: RootContent[] | null = null;
  let heading: Heading | null = null;
  const flush = () => {
    if (current && heading)
      out.push({
        file: s.file,
        title: mdToString(heading),
        heading,
        nodes: current,
        ...lines(s.file, current),
      });
  };
  for (const n of s.nodes) {
    if (n.type === "heading" && n.depth === depth) {
      flush();
      heading = n;
      current = [n];
    } else if (current) {
      current.push(n);
    }
  }
  flush();
  return out;
}

/** Plain text of a run of nodes (for descriptions and word counts). */
export function plainText(nodes: RootContent[]): string {
  return nodes.map((n) => mdToString(n)).join("\n\n");
}

/** The first paragraph of a section, as plain text. */
export function firstParagraph(s: Section): string {
  const p = s.nodes.find((n) => n.type === "paragraph");
  return p ? mdToString(p) : "";
}

export function wordCount(file: string): number {
  return plainText(parse(file).children).split(/\s+/).filter(Boolean).length;
}

/** The second-level headings of a file, for a table of contents. */
export function outline(file: string): { depth: number; text: string }[] {
  return parse(file)
    .children.filter((n): n is Heading => n.type === "heading" && n.depth >= 2 && n.depth <= 3)
    .map((h) => ({ depth: h.depth, text: mdToString(h) }));
}

/** Nodes `start` to `end` of a section (top-level nodes, end exclusive), with their own lines. */
export function part(s: Section, start: number, end?: number): Section {
  const nodes = s.nodes.slice(start, end);
  return { ...s, heading: undefined, nodes, ...lines(s.file, nodes) };
}

/** Index of the first top-level node of a section whose plain text starts with `prefix`. */
export function indexOf(s: Section, prefix: string): number {
  const i = s.nodes.findIndex((n) => mdToString(n).startsWith(prefix));
  if (i === -1)
    throw new Error(`content: ${s.file}: no node in "${s.title}" starts with "${prefix}"`);
  return i;
}

/**
 * The design doc marks where a figure belongs with a paragraph like "[Chart: ...]" or
 * "[Diagram: ...]". Splits a section around that paragraph, so the page can draw the figure there.
 */
export function aroundPlaceholder(
  s: Section,
): { before: Section; placeholder: string; after: Section } | null {
  const i = s.nodes.findIndex(
    (n) => n.type === "paragraph" && /^\[(Chart|Diagram):/.test(mdToString(n)),
  );
  if (i === -1) return null;
  const node = s.nodes[i] as RootContent;
  return {
    before: part(s, 0, i),
    placeholder: mdToString(node),
    after:
      i + 1 < s.nodes.length
        ? part(s, i + 1)
        : { ...s, heading: undefined, nodes: [], startLine: s.endLine, endLine: s.endLine },
  };
}

/** Every section of `file` whose heading is exactly `text` (for example each note's "Gaps"), with the heading above it. */
export function sectionsNamed(file: string, text: string): (Section & { parent: string })[] {
  const children = parse(file).children;
  const out: (Section & { parent: string })[] = [];
  let parent = "";
  children.forEach((n, i) => {
    if (n.type !== "heading") return;
    const t = mdToString(n);
    if (n.depth === 2) parent = t;
    if (t !== text) return;
    let end = i + 1;
    while (end < children.length) {
      const m = children[end] as RootContent;
      if (m.type === "heading" && m.depth <= n.depth) break;
      end++;
    }
    const body = children.slice(i + 1, end);
    out.push({
      file,
      title: t,
      heading: n,
      nodes: body,
      parent,
      ...lines(file, children.slice(i, end)),
    });
  });
  return out;
}

export type Citation = { url: string; text: string; file: string; line: number };

/** Every external link in a file, in order, with the line it is on. */
export function citations(file: string): Citation[] {
  const out: Citation[] = [];
  const walk = (n: RootContent | Root) => {
    if (n.type === "link" && /^https?:\/\//.test(n.url)) {
      out.push({ url: n.url, text: mdToString(n), file, line: n.position?.start.line ?? 0 });
    }
    if ("children" in n) for (const c of n.children) walk(c as RootContent);
  };
  walk(parse(file));
  return out;
}

/**
 * A paragraph up to (not including) the sentence that starts with `phrase`: for a source like the
 * brief, whose story is followed by instructions about the story in the same paragraph.
 */
export function upTo(node: RootContent, phrase: string): RootContent {
  if (node.type !== "paragraph")
    throw new Error(`content: upTo needs a paragraph, not ${node.type}`);
  const children: typeof node.children = [];
  for (const c of node.children) {
    if (c.type === "text" && c.value.includes(phrase)) {
      children.push({ ...c, value: c.value.slice(0, c.value.indexOf(phrase)).trimEnd() });
      return { ...node, children };
    }
    children.push(c);
  }
  throw new Error(`content: no "${phrase}" in the paragraph`);
}

export type Quote = { text: string; file: string; line: number };

/**
 * Sentences of the research as written, found by their opening words, with the line they are on.
 * Searches every paragraph in the section (list items included); `heading` "" means the lead. Throws
 * when the research no longer says it, so a quote on a page cannot drift from its source.
 */
export function quote(file: string, heading: string, start: string, sentences = 1): Quote {
  const s = heading === "" ? lead(file) : section(file, heading);
  const paras: { text: string; line: number }[] = [];
  for (const n of s.nodes) {
    visit(n, "paragraph", (p) => {
      paras.push({ text: mdToString(p), line: p.position?.start.line ?? s.startLine });
    });
  }
  for (const p of paras) {
    const i = p.text.indexOf(start);
    if (i < 0) continue;
    let rest = p.text.slice(i);
    let out = "";
    for (let k = 0; k < sentences && rest; k++) {
      const m = /^.*?[.!?](?=\s+[A-Z(~0-9$]|$)/s.exec(rest);
      if (!m) {
        out += rest;
        break;
      }
      out += m[0];
      rest = rest.slice(m[0].length);
    }
    return { text: out.trim(), file, line: p.line };
  }
  throw new Error(`content: ${file}: "${heading || "lead"}" no longer says "${start}"`);
}
