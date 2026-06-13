# Common Humanity Coalition — website

The public site for the [Common Humanity Coalition](https://commonhumanity.us). A single
GitHub Pages repo (custom domain **commonhumanity.us**) holding **two Astro apps**:

- **Marketing site** — Astro at the repo root, served at `/`.
- **Public incident database** — Astro in [`incidents-app/`](incidents-app/), served at
  `/incidents/`. Its incident data is **pulled** from the incident database export
  endpoint and committed as `incidents-app/data/snapshot.json` (CI can't reach the DB).

This folder is the **canonical dev location** for the site and replaces the retired
ad-hoc clone at `repo-audits/chc-website`.

## Quickstart

Everything runs in `node:22` containers — no host installs.

```sh
make refresh    # pull the latest published incidents into incidents-app/data/snapshot.json
make build      # build root -> dist/ and incidents-app -> dist/incidents/ (mirrors CI)
make preview    # serve dist/ via nginx on http://localhost:8093/ (+ /incidents/)
make deploy     # commit changes, push main, push production (triggers CI), watch + verify
make publish    # refresh + deploy: pull latest incidents and ship in one go
make dev        # Astro dev server for the marketing site on :4321 (live reload)
```

Typical "bring the live site current" flow: `make publish` (or `make refresh` then,
after eyeballing `make preview`, `make deploy`).

## How it deploys

Develop on **`main`**; deploy by pushing **`production`**. `.github/workflows/page_deploy.yaml`
builds both apps and publishes the combined `dist/` to GitHub Pages. `make deploy`
fast-forwards `production` onto `main`, pushes it, and watches the run to success.

See [`CLAUDE.md`](CLAUDE.md) for the full layout, data interface, and conventions, and
[`incidents-app/README.md`](incidents-app/README.md) for the incident-database app.
