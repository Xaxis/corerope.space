/** Where the site lives, and the repository every page links back to. */
export const SITE = {
  name: "Corerope",
  url: "https://corerope.space",
  repo: "https://github.com/Xaxis/corerope.space",
  branch: "main",
  tagline: "How to make a frontier-quality LLM roughly 1000x cheaper to run",
  description:
    "An open research program on making a frontier-quality LLM roughly 1000x cheaper to run, in energy and dollars per solved task: a survey of every known efficiency lever, and a design for the stack they cannot reach.",
} as const;

/** The build marker: the commit this site was built from (tools/site/deploy.sh sets it). */
export const BUILD = process.env.CORE_BUILD ?? "dev";

export type Repo = { path: string; startLine?: number; endLine?: number };

/** A file in the repository on GitHub, optionally at a range of lines. */
export function blobUrl({ path, startLine, endLine }: Repo): string {
  const lines =
    startLine === undefined
      ? ""
      : endLine && endLine !== startLine
        ? `#L${startLine}-L${endLine}`
        : `#L${startLine}`;
  return `${SITE.repo}/blob/${SITE.branch}/${path}${lines}`;
}

/** GitHub's editor for a file. */
export function editUrl(path: string): string {
  return `${SITE.repo}/edit/${SITE.branch}/${path}`;
}

export const NAV = [
  { href: "/baseline", label: "Baseline" },
  { href: "/levers", label: "Levers" },
  { href: "/design", label: "Design" },
  { href: "/cost-model", label: "Cost model" },
  { href: "/experiments", label: "Experiments" },
  { href: "/risks", label: "Risks" },
  { href: "/research", label: "Research" },
] as const;
