"use client";

// The chapters of a long page, in a row that stays under the header, with the one in view marked.
import { useSectionInView } from "./useSectionInView";

export function SubNav({ items, label }: { items: { id: string; text: string }[]; label: string }) {
  const active = useSectionInView(items);
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
