import Link from "next/link";
import { BUILD, SITE } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  const commit = BUILD !== "dev" ? `${SITE.repo}/commit/${BUILD}` : SITE.repo;
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link href="/" className="brand" style={{ marginBottom: 12 }}>
              <Logo />
              <span>Corerope</span>
            </Link>
            <p style={{ margin: "12px 0 0", maxWidth: "38ch", lineHeight: 1.55 }}>
              An open research program on making a frontier-quality LLM roughly 1000x cheaper to
              run. A design, not a result: nothing in it is proven at scale.
            </p>
          </div>
          <div>
            <h2>The survey</h2>
            <ul>
              <li>
                <Link href="/baseline">The baseline</Link>
              </li>
              <li>
                <Link href="/levers">The levers</Link>
              </li>
              <li>
                <Link href="/research">Research library</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>The design</h2>
            <ul>
              <li>
                <Link href="/design">Seven inventions</Link>
              </li>
              <li>
                <Link href="/cost-model">Cost model</Link>
              </li>
              <li>
                <Link href="/experiments">Experiments</Link>
              </li>
              <li>
                <Link href="/risks">Risks and prior art</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>The repository</h2>
            <ul>
              <li>
                <a href={SITE.repo}>Source on GitHub</a>
              </li>
              <li>
                <a href={`${SITE.repo}/tree/${SITE.branch}/research`}>research/</a>
              </li>
              <li>
                <a href={`${SITE.repo}/tree/${SITE.branch}/data`}>data/</a>
              </li>
              <li>
                <a href={`${SITE.repo}#reproduce`}>Reproduce the results</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="foot-note">
          <span>Every number on this site links to the research file or script it came from.</span>
          <span>
            Built from{" "}
            <a href={commit} className="mono">
              {BUILD === "dev" ? "a local build" : BUILD}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
