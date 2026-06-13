import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// Static, self-contained public site.
//
// This app is built as a SUBDIRECTORY of the Common Humanity Coalition website
// and served at https://commonhumanity.us/incidents/. The website repo's deploy
// workflow builds this app and assembles its output into the website's
// `dist/incidents`.
//
// `site` (production origin, used for canonical / OpenGraph URLs) and `base`
// (the path the site is mounted at) are driven by env vars so the same source
// can serve at the subpath *and* anywhere else without a code change. The
// defaults below produce the production layout (a `/incidents`-rooted,
// commonhumanity.us-origin site) on a plain `npm run build`:
//
//   - Production (subdirectory of commonhumanity.us — the defaults):
//       SITE_ORIGIN=https://commonhumanity.us  BASE_PATH=/incidents
//   - Domain root (if ever served standalone at its own origin):
//       SITE_ORIGIN=https://example.com  BASE_PATH=/
//
// Internal links/assets all flow through withBase() (src/lib/paths.ts), which
// reads Astro's resolved base from import.meta.env.BASE_URL.
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://commonhumanity.us';
const BASE_PATH = process.env.BASE_PATH || '/incidents';

export default defineConfig({
  site: SITE_ORIGIN,
  base: BASE_PATH,
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Dev server runs in a container; allow the cross-container host used by
      // the Playwright browser (and Docker's gateway). No effect on the static
      // production build.
      allowedHosts: ['host.docker.internal', 'localhost', '.docker.internal'],
    },
    preview: {
      // `astro preview` uses vite.preview (not vite.server); mirror the same
      // container-host allowlist so the built site can be previewed from a
      // sibling container (e.g. the Playwright browser). No effect on the
      // static production build served by a CDN.
      allowedHosts: ['host.docker.internal', 'localhost', '.docker.internal'],
    },
  },
});
