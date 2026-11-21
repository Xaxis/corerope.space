"use client";

import { useEffect, useState } from "react";

export type TocItem = { id: string; text: string; depth: number };

/** A page's contents, with the section in view marked as you scroll. */
const title = "On this page";

export function Toc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => e !== null);
    if (els.length === 0) return;
    const onScroll = () => {
      let current: string | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top < 120) current = el.id;
        else break;
      }
      setActive(current ?? els[0]?.id ?? null);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);
  const list = (
    <ol>
      {items.map((i) => (
        <li key={i.id} className={`d${i.depth}`}>
          <a href={`#${i.id}`} data-active={i.id === active}>
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
