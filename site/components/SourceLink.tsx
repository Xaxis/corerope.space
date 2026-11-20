import { blobUrl, editUrl, type Repo } from "@/lib/site";

/** "From research/x.md, lines a to b": view those lines on GitHub, or edit the file. */
export function SourceLink({
  path,
  startLine,
  endLine,
  label = "Source",
}: Repo & { label?: string }) {
  const where =
    startLine === undefined
      ? ""
      : endLine && endLine !== startLine
        ? `, lines ${startLine} to ${endLine}`
        : `, line ${startLine}`;
  return (
    <p className="source-link">
      <span className="source-label">{label}:</span>{" "}
      <a href={blobUrl({ path, startLine, endLine })} className="mono">
        {path}
        {where}
      </a>
      <span className="source-sep" aria-hidden="true">
        {" · "}
      </span>
      <a href={editUrl(path)}>Edit on GitHub</a>
    </p>
  );
}
