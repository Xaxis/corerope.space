# Deploy

tools/site/deploy.sh ships the committed tree at HEAD to the Vercel project "corerope" (team
xaxis-projects) and proves the live domains serve that commit.

<!-- covers: cli:deploy -->

## Sub-features

- project: creates the project on first run; sets root directory site, files outside it included,
  Next.js, Node 24.x; adds corerope.space and www.corerope.space (308 to the apex).
- upload: `git archive HEAD`, never the working tree; `CORE_BUILD=<sha>` becomes the build marker.
- proof: on each live production domain, / is 200 with the marker and the security headers (nosniff,
  referrer policy, frame DENY, CSP); the share card, stylesheet, icons, manifest, robots and sitemap
  answer with their types; /no-such-page is 404; shots.ts and interact.ts pass; www 308s once its
  DNS is right.
- dns: a custom domain whose DNS is not pointed yet is skipped, and the script prints the A and
  CNAME records it needs.

## How to reach it

- `~/.claude/claude-core/bin/heavy tools/site/deploy.sh` (deploy HEAD and check);
  `tools/site/deploy.sh --check [SHA]` (check only).

## How to check it

Static: `bash -n tools/site/deploy.sh`, `shellcheck -x tools/site/deploy.sh`.

Runtime:

```sh
~/.claude/claude-core/bin/heavy tools/site/deploy.sh --check
```

Proves it when: it ends "site ok: <HEAD sha> is live at https://... (N checks passed)". Any
"waiting for DNS" lines list records still to add at the registrar (Namecheap).

## Gotchas

- Needs VERCEL_TOKEN in .env (gitignored, mode 600). The token is written only to a mode-700 temp
  directory, never to a command line or log.
- Commit first: uncommitted changes are not deployed, and the script says so.
- Per-deployment URLs are behind Vercel's deployment protection; only production domains count.
