# Common Humanity Coalition — website

The public website for the [Common Humanity Coalition](https://commonhumanity.us), built
with [Astro](https://astro.build) 5 (static output) and Tailwind CSS 4, in TypeScript.

It deploys at the domain root (`https://commonhumanity.us`) via GitHub Pages.

## Design language

This site shares one visual identity with the coalition's **Incident Database** site
(`idb-public-site`). That repository is the **design-language source of truth**: the
palette (warm paper neutrals + a deep teal-slate accent), the serif display stack, the
header/footer structure, and `src/styles/global.css` are copied and adapted from it.
The two small sites duplicate this design system deliberately rather than sharing a
package — keep palette/typography changes in sync across both repos.

## Build locally

No host installs are required — everything runs in a Node container:

```sh
# install deps + build (output goes to dist/, git-ignored)
docker run --rm -v "$PWD":/app -w /app node:22 sh -c "npm ci && npm run build"

# type/diagnostics check
docker run --rm -v "$PWD":/app -w /app node:22 sh -c "npm ci && npm run check"

# live-reload dev server (publish a port; allowedHosts already covers containers)
docker run --rm -v "$PWD":/app -w /app -p 4321:4321 node:22 \
  sh -c "npm ci && npm run dev -- --host 0.0.0.0"
```

To preview a production build, serve `dist/` with any static file server, e.g.:

```sh
docker run --rm -v "$PWD/dist":/usr/share/nginx/html:ro -p 8091:80 nginx:alpine
```

## Pages

| URL         | Source                       |
| ----------- | ---------------------------- |
| `/`         | `src/pages/index.astro`      |
| `/about/`   | `src/pages/about.astro`      |
| `/contact/` | `src/pages/contact.astro`    |
| 404         | `src/pages/404.astro`        |

Shared chrome lives in `src/layouts/BaseLayout.astro` (meta/OG, header, footer) and
`src/components/{Header,Footer}.astro`. Site-wide metadata (Incident Database URL, the
content licence, the mission one-liner, the SEO description) is centralised in
`src/lib/site.ts`. `src/lib/paths.ts` provides `withBase()`, kept for parity with the
database site even though this site serves at the root.

## Deploy

Pushing to the **`production`** branch triggers `.github/workflows/page_deploy.yaml`,
which builds with `actions/setup-node@v4` (Node 22) + `npm ci` + `npm run build` and
publishes `dist/` to GitHub Pages. The workflow can also be run via **workflow_dispatch**.

Develop on `main`, then fast-forward / merge `main` into `production` to ship.

## Incident Database

The coalition's public Incident Database is the site's primary call to action. It is
currently hosted at:

- **https://common-humanity-coalition.github.io/incidents/**

At DNS cutover this will move to **https://incidents.commonhumanity.us**. When that
happens, update the single constant `INCIDENT_DB_URL` in `src/lib/site.ts` (it feeds the
header, footer, home page, contact page, and 404).
