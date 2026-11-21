"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, SITE } from "@/lib/site";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

function current(pathname: string, href: string): "page" | undefined {
  return pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined;
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: close the menu whenever the page changes
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="site-head">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Corerope, home">
          <Logo />
          <span>Corerope</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(pathname, n.href)}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="head-tools">
          <a className="icon-btn" href={SITE.repo}>
            <span className="visually-hidden">The repository on GitHub</span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
            </svg>
          </a>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn menu-btn"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      <nav
        id="mobile-nav"
        className="mobile-nav"
        data-open={open}
        aria-label="Main, on small screens"
        hidden={!open}
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={current(pathname, n.href)}
            onClick={() => setOpen(false)}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
