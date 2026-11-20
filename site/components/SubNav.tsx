"use client";

// The chapters of a long page, in a row that stays under the header, with the one in view marked.
import { useEffect, useState } from "react";

export function SubNav({ items, label }: { items: { id: string; text: string }[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => !!e);
    const onScroll = () => {
      let current: string | null = null;
      for (const el of els) {
        if (el.getBoundingClientRect().top < 140) current = el.id;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);
  return (
    <nav className="subnav" aria-label={label}>
      <div className="wrap">
        <ol>
          {items.map((i, k) => (
            <li key={i.id}>
              <a href={`#${i.id}`} aria-current={i.id === active ? "location" : undefined}>
                <span className="subnav-n">{String(k + 1).padStart(2, "0")}</span>
                {i.text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
