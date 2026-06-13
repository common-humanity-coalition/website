# Incident Database (incidents-app)

Static, self-contained Astro site for the Common Humanity Coalition incident
database. It is built as a **subdirectory of the main website** and served at
**https://commonhumanity.us/incidents/**.

This directory is the canonical source of the database app. The website's deploy
workflow (`../.github/workflows/page_deploy.yaml`) builds it and assembles its
output into the website's `dist/incidents`. There is no separate deploy here.

## Build

A plain build produces the production layout (rooted at `/incidents`, origin
`https://commonhumanity.us`) via the env defaults in `astro.config.mjs`:

```bash
npm ci
npm run build      # -> dist/  (assets under /incidents/_astro/, etc.)
```

`SITE_ORIGIN` and `BASE_PATH` remain overridable, e.g. to serve standalone:

```bash
SITE_ORIGIN=https://example.com BASE_PATH=/ npm run build
```

## Data

The site builds entirely from `data/snapshot.json` (contract version 1; schema in
`src/lib/types.ts`, validated at build time by `src/lib/data.ts`). The snapshot
holds only reviewed, published incidents exported from the coalition's internal
review system. It is updated by the private `incident_database` repo's
`scripts/publish_public_site.sh`, which commits a fresh snapshot here and pushes
to the website repo to trigger a deploy.

A deterministic fake fixture for local development can be regenerated with
`npm run gen:fixture`.

## Stack

Astro 5 (static output), React islands (browse/search, charts), Tailwind CSS v4,
Recharts, MiniSearch, TypeScript. No external font or script CDNs.
