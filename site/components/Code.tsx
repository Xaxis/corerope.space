import { codeToHtml } from "shiki";
import { readRepo } from "@/lib/content";
import { blobUrl } from "@/lib/site";

const LANG: Record<string, string> = {
  py: "python",
  sh: "bash",
  ts: "typescript",
  json: "json",
  md: "markdown",
};

/** A file of the repository, highlighted for both themes, with a link to it on GitHub. */
export async function Code({
  path,
  open = false,
  note,
}: {
  path: string;
  open?: boolean;
  note?: string;
}) {
  const source = readRepo(path);
  const lang = LANG[path.split(".").pop() ?? ""] ?? "text";
  const html = await codeToHtml(source, {
    lang,
    themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
    defaultColor: false,
  });
  const lines = source.trimEnd().split("\n").length;
  return (
    <details className="code-file" open={open}>
      <summary>
        {path}
        <span>
          {lines} lines{note ? `, ${note}` : ""}
        </span>
      </summary>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: shiki's output for a file of this repository */}
      <div className="code" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="source-link">
        <a href={blobUrl({ path })}>View {path} on GitHub</a>
      </p>
    </details>
  );
}
