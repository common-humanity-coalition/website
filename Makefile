# Common Humanity Coalition website — local dev / build / deploy tooling.
#
# All Node work runs inside `node:22` containers (no host installs). Colima
# mounts only $HOME, and this repo lives under /Users/server/, so the bind
# mounts below work. `docker-compose` is not needed here — plain `docker run`.
#
# Targets:
#   make refresh   PULL latest published incidents into incidents-app/data/snapshot.json
#   make build     Build root site -> dist/, then incidents-app -> dist/incidents/ (mirrors CI)
#   make preview   Serve assembled dist/ via nginx on :8093 (container chc-preview)
#   make dev       Astro dev server for the marketing site on 0.0.0.0:4321 (foreground)
#   make deploy    Commit working changes, push main, ff/push production, watch CI, print live URLs
#   make publish   refresh + deploy (the end-to-end "pull latest incidents and ship" flow)
#
# Quickstart:  make refresh && make preview   (then browse http://localhost:8093/)
#              make publish                   (pull latest incidents + deploy live)

SHELL := /bin/bash
ROOT := $(shell pwd)

DOCKER := /opt/homebrew/bin/docker
NODE_IMAGE := node:22

PREVIEW_NAME := chc-preview
PREVIEW_PORT := 8093

SITE_ORIGIN := https://commonhumanity.us
INCIDENTS_BASE := /incidents

# Run a shell command inside a throwaway node:22 container with the repo
# bind-mounted at /app. $$ escapes make's variable expansion for the shell.
define NODE_RUN
$(DOCKER) run --rm -v "$(ROOT)":/app -w /app $(NODE_IMAGE) sh -c '$(1)'
endef

.PHONY: refresh build preview dev deploy publish

# --- refresh ---------------------------------------------------------------
# PULL the latest published-incident snapshot from the export endpoint into
# incidents-app/data/snapshot.json (with a preview + confirmation). Does NOT
# commit or deploy. Set ASSUME_YES=1 to skip the prompt.
refresh:
	@ASSUME_YES=$(ASSUME_YES) bash "$(ROOT)/scripts/refresh-incidents.sh"

# --- build -----------------------------------------------------------------
# Mirror CI exactly so local build == deployed:
#   1. root:          npm ci && npm run build           -> dist/
#   2. incidents-app: npm ci && (BASE_PATH/SITE_ORIGIN) npm run build -> incidents-app/dist/
#   3. assemble:      dist/incidents/ <- incidents-app/dist/
build:
	@echo "==> Building root marketing site -> dist/"
	$(call NODE_RUN,npm ci && npm run build)
	@echo "==> Building incidents-app -> incidents-app/dist/ (BASE_PATH=$(INCIDENTS_BASE))"
	$(DOCKER) run --rm -v "$(ROOT)":/app -w /app/incidents-app \
		-e BASE_PATH=$(INCIDENTS_BASE) -e SITE_ORIGIN=$(SITE_ORIGIN) \
		$(NODE_IMAGE) sh -c 'npm ci && npm run build'
	@echo "==> Assembling incidents-app into dist/incidents/"
	$(call NODE_RUN,rm -rf dist/incidents && mkdir -p dist/incidents && cp -R incidents-app/dist/. dist/incidents/)
	@echo "==> Build complete. dist/ now contains the full site (root + /incidents)."

# --- preview ---------------------------------------------------------------
# Serve the assembled dist/ with nginx. `absolute_redirect off` keeps the :8093
# port on trailing-slash redirects so links don't drop to port 80.
preview:
	@if [ ! -d "$(ROOT)/dist/incidents" ]; then \
		echo "dist/incidents not found — run 'make build' first."; exit 1; \
	fi
	@echo "==> (re)starting nginx preview container '$(PREVIEW_NAME)' on :$(PREVIEW_PORT)"
	-@$(DOCKER) rm -f $(PREVIEW_NAME) >/dev/null 2>&1 || true
	@printf 'server {\n  listen 80;\n  absolute_redirect off;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $$uri $$uri/ $$uri/index.html =404; }\n}\n' > "$(ROOT)/dist/.preview-nginx.conf"
	$(DOCKER) run -d --name $(PREVIEW_NAME) --restart unless-stopped \
		-p $(PREVIEW_PORT):80 \
		-v "$(ROOT)/dist":/usr/share/nginx/html:ro \
		-v "$(ROOT)/dist/.preview-nginx.conf":/etc/nginx/conf.d/default.conf:ro \
		nginx:alpine >/dev/null
	@echo ""
	@echo "  Preview is live:"
	@echo "    Local:   http://localhost:$(PREVIEW_PORT)/"
	@echo "    Tailnet: http://mac-mini.stork-danio.ts.net:$(PREVIEW_PORT)/"
	@echo "    Incidents: http://localhost:$(PREVIEW_PORT)/incidents/"

# --- dev -------------------------------------------------------------------
# Astro dev server (live reload) for the MARKETING site, bound to 0.0.0.0:4321
# so it is reachable from sibling containers (e.g. Playwright) at
# host.docker.internal:4321 and from the host at localhost:4321. Foreground;
# Ctrl-C to stop. For the incidents-app, build + preview is the supported path.
dev:
	@echo "==> Astro dev server (marketing site) on 0.0.0.0:4321 — Ctrl-C to stop"
	@echo "    Local: http://localhost:4321/   Containers: http://host.docker.internal:4321/"
	$(DOCKER) run --rm -it -v "$(ROOT)":/app -w /app -p 4321:4321 \
		$(NODE_IMAGE) sh -c 'npm ci && npm run dev -- --host 0.0.0.0'

# --- deploy ----------------------------------------------------------------
# Commit any working changes, push main, fast-forward production onto main and
# push it (production triggers CI), watch the deploy to success, print URLs.
deploy:
	@set -euo pipefail; \
	cd "$(ROOT)"; \
	if [ -n "$$(git status --porcelain)" ]; then \
		echo "==> Committing working changes"; \
		git add -A; \
		git commit -m "Refresh incident snapshot and/or site changes" \
			-m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"; \
	else \
		echo "==> Working tree clean — nothing to commit"; \
	fi; \
	echo "==> Pushing main"; \
	git push origin main; \
	echo "==> Fast-forwarding production onto main and pushing"; \
	git fetch origin production; \
	git branch -f production main; \
	git push origin production; \
	echo "==> Watching GitHub Pages deploy (production)"; \
	sleep 5; \
	RUN_ID=$$(gh run list --branch production --workflow "Deploy site" --limit 1 --json databaseId --jq '.[0].databaseId'); \
	if [ -n "$$RUN_ID" ]; then gh run watch "$$RUN_ID" --exit-status || (echo "Deploy did not succeed"; exit 1); fi; \
	echo ""; \
	echo "  Live:"; \
	echo "    https://commonhumanity.us/"; \
	echo "    https://commonhumanity.us/incidents/"

# --- publish ---------------------------------------------------------------
# End-to-end: pull latest incidents, then deploy. ASSUME_YES=1 recommended for
# unattended runs (otherwise refresh prompts before updating the snapshot).
publish: refresh deploy
