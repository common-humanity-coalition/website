# CLAUDE.md — common_humanity_website

Guidance for Claude Code sessions working in this folder. This is the **canonical
dev location** for the Common Humanity Coalition website; it REPLACES the old ad-hoc
clone at `/Users/server/repo-audits/chc-website` (now retired).

## What this is

The single GitHub repo `common-humanity-coalition/website` (GitHub Pages, custom
domain **commonhumanity.us**) holds **two Astro apps** deployed as one site:

- **Marketing site** — Astro at the repo root, served at `/` (commonhumanity.us).
- **Public incident database front-end** — Astro in `incidents-app/`, served at
  `/incidents/` (commonhumanity.us/incidents/). React islands, MiniSearch, Recharts.

`incidents-app/` is the **design-language source of truth** (palette: warm paper
neutrals + deep teal-slate accent; serif display stack; header/footer). The marketing
site deliberately duplicates that design system rather than sharing a package — keep
palette/typography changes in sync across both.

## Repo layout (top level)

```
astro.config.mjs        root marketing site (site=commonhumanity.us, base=/)
package.json            root deps (Astro 5 + Tailwind 4)
src/ public/            marketing site source
incidents-app/          the /incidents/ app (own package.json, astro.config, data/)
  data/snapshot.json    COMMITTED incident data the build consumes (see Data interface)
scripts/refresh-incidents.sh   PULL the snapshot from the DB export endpoint
Makefile                refresh / build / preview / dev / deploy / publish
.github/workflows/page_deploy.yaml   CI that builds BOTH apps and ships to Pages
```

## Deploy model

- Develop and commit on **`main`** (no CI on main).
- Deploy by pushing **`production`** — `page_deploy.yaml` (triggered on push to
  `production`) builds the root site to `dist/`, then builds `incidents-app` with
  `BASE_PATH=/incidents SITE_ORIGIN=https://commonhumanity.us` and assembles it into
  `dist/incidents/`, and publishes the combined `dist/` to GitHub Pages.
- `main` and `production` are normally kept in lockstep; `make deploy` fast-forwards
  `production` onto `main` and pushes it. Push uses the SSH remote.

## Data interface (incidents are PULLED, then committed)

The incident database exposes a read-only, unauthenticated v1 snapshot:

    http://incident-database.stork-danio.ts.net/public/snapshot.json

shape `{version, generated_at, vocabularies, incidents}`, **published incidents only**.

**CI runners cannot reach the internal/tailnet DB**, so `incidents-app/data/snapshot.json`
is committed and the build reads the committed file. To bring the site current you must
refresh the snapshot **here on the server** and commit it:

- `make refresh` runs `scripts/refresh-incidents.sh`: curls the endpoint, validates it
  is JSON with `version:1` and a non-empty `incidents` array, shows a preview diff
  (total / +new / -removed / ~changed ids; a `generated_at`-only diff is reported as
  "no data changes"), then prompts before overwriting the local snapshot. It does NOT
  commit or deploy. `ASSUME_YES=1 make refresh` skips the prompt. The endpoint URL is an
  editable variable at the top of the script (`SNAPSHOT_URL`).

## Makefile targets

| Target    | What it does |
| --------- | ------------ |
| `refresh` | Pull latest published incidents into `incidents-app/data/snapshot.json` (preview + confirm; no commit). |
| `build`   | Build root → `dist/`, then `incidents-app` → `dist/incidents/`, mirroring CI exactly (local build == deployed). |
| `preview` | Serve assembled `dist/` via nginx container `chc-preview` on **:8093** (`absolute_redirect off` so links keep the port). Local `http://localhost:8093/`, tailnet `http://mac-mini.stork-danio.ts.net:8093/`. |
| `dev`     | Astro dev server for the **marketing site** on `0.0.0.0:4321` (containers reach it at `host.docker.internal:4321`). Foreground. |
| `deploy`  | Commit working changes, push `main`, ff/push `production` (triggers CI), `gh run watch` to success, print live URLs. |
| `publish` | `refresh` then `deploy` — the end-to-end "pull latest incidents and ship" flow. |

All Node work runs in `node:22` containers (no host installs). `docker` is at
`/opt/homebrew/bin/docker`. The repo lives under `$HOME` so Colima bind mounts work.

## Contact form

The marketing contact page (`src/pages/contact.astro`) posts to **Formspree** form id
**`xgveqoan`** (`FORMSPREE_FORM_ID` / `FORMSPREE_ENDPOINT` in `src/lib/site.ts`).
Formspree handles the POST off-site; nothing server-side here.

## Conventions / guardrails

- No host installs — Node only via `node:22` containers (the Makefile does this).
- Don't commit `dist/`, `node_modules/`, or `.astro/` (gitignored).
- Match the existing Astro/TS/Tailwind style of each app.
- The committed `incidents-app/data/snapshot.json` is a real data artifact — refresh it
  intentionally via `make refresh`; don't hand-edit it.
