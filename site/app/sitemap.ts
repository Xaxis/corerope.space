import type { MetadataRoute } from "next";
import { DOCS } from "@/lib/content";
import { inventions } from "@/lib/inventions";
import { NAV, SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    ...NAV.map((n) => n.href),
    ...inventions().map((x) => `/design/${x.slug}`),
    ...DOCS.map((d) => `/research/${d.slug}`),
  ];
  return paths.map((p) => ({
    url: `${SITE.url}${p === "/" ? "" : p}`,
    changeFrequency: "monthly",
    priority: p === "/" ? 1 : 0.7,
  }));
}
