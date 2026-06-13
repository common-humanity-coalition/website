import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static, self-contained public site for the Common Humanity Coalition.
//
// This site deploys at the domain root (https://commonhumanity.us) with no base
// path, so `site` is fixed and `base` defaults to '/'. (The companion incident
// database site is the design-language source of truth and uses an env-driven
// base because it also serves under a GitHub Pages subpath; this site does not
// need that flexibility.)
export default defineConfig({
  site: 'https://commonhumanity.us',
  base: '/',
  output: 'static',
  // Emit and expect directory-style URLs with a trailing slash (e.g. /about/),
  // matching the directory build output. This avoids host-dropping 301 redirects
  // from servers that "fix up" /about -> /about/ (notably the local nginx preview).
  trailingSlash: 'always',
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Dev server runs in a container; allow the cross-container host used by
      // the Playwright browser (and Docker's gateway). No effect on the static
      // production build.
      allowedHosts: ['host.docker.internal', 'localhost', '.docker.internal'],
    },
    preview: {
      allowedHosts: ['host.docker.internal', 'localhost', '.docker.internal'],
    },
  },
});
