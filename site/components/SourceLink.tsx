import { blobUrl, editUrl, type Repo, whereLabel } from "@/lib/site";

/** "Source: research/x.md, lines a to b (edit on GitHub)": view those lines, or edit the file. */
export function SourceLink({ path, startLine, endLine }: Repo) {
  return (
    <p className="source-link">
      <span className="source-label">Source:</span>{" "}
      <a href={blobUrl({ path, startLine, endLine })} className="mono">
        {whereLabel({ path, startLine, endLine })}
      </a>{" "}
      {/* One unit, so a wrapped line never starts or ends on a lone bracket. */}
      <span className="nowrap">
        (<a href={editUrl(path)}>edit on GitHub</a>)
      </span>
    </p>
  );
}
