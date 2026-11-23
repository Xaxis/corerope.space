"use client";

import { useSectionInView } from "./useSectionInView";

export type TocItem = { id: string; text: string; depth: number };

/** A page's contents, with the section in view marked as you scroll. */
const title = "On this page";

export function Toc({ items }: { items: TocItem[] }) {
  // Above the first heading, the first entry is marked.
  const active = useSectionInView(items) ?? items[0]?.id;
  const list = (
    <ol>
      {items.map((i) => (
        <li key={i.id} className={`d${i.depth}`}>
          <a href={`#${i.id}`} aria-current={i.id === active ? "location" : undefined}>
            {i.text}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <nav className="toc" aria-label={title}>
        <h2>{title}</h2>
        {list}
      </nav>
      <details className="toc-mobile">
        <summary>{title}</summary>
        {list}
      </details>
    </>
  );
}
