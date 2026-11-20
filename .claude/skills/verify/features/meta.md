# Metadata routes, the 404 page and visitor counting

What browsers, crawlers and link previews fetch: icons, the share card, the manifest, robots,
the sitemap, and the not-found page. Plus the one third-party script: Overlook's visitor counter.

<!-- covers: api:GET /apple-icon, api:GET /manifest.webmanifest, api:GET /opengraph-image, api:GET /robots.txt, api:GET /sitemap.xml, page:/icon.svg, page:/_not-found -->

## Sub-features

- icon: /icon.svg, the rope mark, light and dark by media query.
- apple-icon: a 180 px PNG of the mark for iOS home screens.
- share card: /opengraph-image, 1200 x 630 PNG with the central multipliers from data/.
- manifest, robots (allows all, names the sitemap), sitemap (15 pages on https://corerope.space: the
  six pages in reading order and the nine research documents).
- not-found: any unknown path answers 404 with links back, on the page template.
- analytics: Overlook's `s.js` with `data-site` = OVERLOOK_SITE (site/lib/site.ts, `ws_5tfmvy5l32`),
  loaded after hydration from site/app/layout.tsx. The CSP (site/next.config.ts) allows
  https://overlook.technology in script-src and connect-src, nothing else. Overlook's project slug is
  `corerope`; it never counts localhost or automated browsers, so local checks add no visits.

## How to reach it

- GET http://localhost:4317/icon.svg , /apple-icon , /opengraph-image , /manifest.webmanifest ,
  /robots.txt , /sitemap.xml , /no-such-page ; each page's head links the icons and the share card.

## How to check it

Static: the build lists each as a static route.

Runtime:

```sh
for p in /icon.svg /apple-icon /opengraph-image /manifest.webmanifest /robots.txt /sitemap.xml /no-such-page; do
  curl -s -o /dev/null -w "$p %{http_code} %{content_type}\n" localhost:4317$p; done
curl -s localhost:4317/sitemap.xml | grep -o '<loc>' | wc -l    # 15
curl -s localhost:4317/ | grep -o 'ws_5tfmvy5l32' | head -1    # the key, in the page data (see Gotchas)
curl -sI localhost:4317/ | grep -i '^content-security-policy' | grep -o "script-src[^;]*;\|connect-src[^;]*;"
```

Proves it when: 200 with image/svg+xml, image/png, image/png, application/manifest+json,
text/plain, application/xml, then 404 for /no-such-page; 15 sitemap entries; the key
prints; both CSP directives name https://overlook.technology. shots.ts fails on any CSP refusal.

Live (after a deploy): Overlook checks each site's home page hourly. Force it and read it back from
/mnt/Projects/overlook.technology/apps/dashboard (read-only on Overlook's database):

```sh
pnpm exec tsx --env-file=../../.env scripts/collect.ts --force corerope
pnpm exec tsx --env-file=../../.env scripts/sites.ts corerope     # "corerope  ws_5tfmvy5l32  live ..."
```

To see a real visit counted end to end, Overlook's own recipe opens the live site headed, reads the
hit back and deletes it: `xvfb-run -a env OV_HEADED=1 node .claude/skills/verify/scripts/site-check.mjs corerope`
(run in /mnt/Projects/overlook.technology).

## Gotchas

- Next.js may append a hash query to the apple-icon and og:image URLs in the head; fetch the URL the
  head names when checking a deploy (deploy.sh does).
- The tracker's `<script>` tag is not in the served HTML: next/script adds it after hydration and
  keeps its attributes in the page data. Overlook's hourly check greps the HTML for the key for this
  reason; grep for the key, not the tag. Next also emits a `<link rel="preload">` for s.js, so a
  browser shows two requests for it, but only one script element runs.
