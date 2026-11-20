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
  { href: "/survey", label: "Survey" },
  { href: "/design", label: "Design" },
  { href: "/cost-model", label: "Cost model" },
  { href: "/experiments", label: "Experiments" },
  { href: "/research", label: "Research" },
] as const;

/** The site in reading order, for the pager at the foot of every page. */
export const PAGES = [
  { href: "/", n: "01", label: "The story" },
  { href: "/survey", n: "02", label: "The survey" },
  { href: "/design", n: "03", label: "The design" },
  { href: "/cost-model", n: "04", label: "The cost model" },
  { href: "/experiments", n: "05", label: "Experiments and risks" },
  { href: "/research", n: "06", label: "The research" },
] as const;

/**
 * Overlook (overlook.technology) counts this site's visitors: no cookies, nothing stored in the
 * visitor's browser, localhost and automated browsers never counted. The key is public; Overlook
 * minted it for the hostname corerope.space (its seed entry "corerope").
 */
export const OVERLOOK_SITE = "ws_5tfmvy5l32";
