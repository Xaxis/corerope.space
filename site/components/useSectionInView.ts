"use client";

import { useEffect, useState } from "react";

/** The id of the last of these sections to reach the line where a jump to it would stop (the
 * page's scroll padding plus the section's own scroll margin), kept current as the page scrolls;
 * null above the first. */
export function useSectionInView(items: readonly { id: string }[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((e): e is HTMLElement => e !== null);
    const px = (v: string) => Number.parseFloat(v) || 0;
    const onScroll = () => {
      const pad = px(getComputedStyle(document.documentElement).scrollPaddingTop);
      let current: string | null = null;
      for (const el of els) {
        // A pixel of slack for sub-pixel rounding after a jump.
        const stop = pad + px(getComputedStyle(el).scrollMarginTop) + 1;
        if (el.getBoundingClientRect().top <= stop) current = el.id;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);
  return active;
}
