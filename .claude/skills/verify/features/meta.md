# Metadata routes and the 404 page

What browsers, crawlers and link previews fetch: icons, the share card, the manifest, robots,
the sitemap, and the not-found page.

<!-- covers: api:GET /apple-icon, api:GET /manifest.webmanifest, api:GET /opengraph-image, api:GET /robots.txt, api:GET /sitemap.xml, page:/icon.svg, page:/_not-found -->

## Sub-features

- icon: /icon.svg, the rope mark, light and dark by media query.
- apple-icon: a 180 px PNG of the mark for iOS home screens.
- share card: /opengraph-image, 1200 x 630 PNG with the central multipliers from data/.
- manifest, robots (allows all, names the sitemap), sitemap (15 pages on https://corerope.space: the
  six pages in reading order and the nine research documents).
- not-found: any unknown path answers 404 with links back, on the page template.

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
```

Proves it when: 200 with image/svg+xml, image/png, image/png, application/manifest+json,
text/plain, application/xml, then 404 for /no-such-page; 15 sitemap entries.

## Gotchas

- Next.js may append a hash query to the apple-icon and og:image URLs in the head; fetch the URL the
  head names when checking a deploy (deploy.sh does).
