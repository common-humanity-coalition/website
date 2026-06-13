// Base-path helpers so the site works both at the domain root and under a
// subpath (e.g. GitHub Pages project pages serve at /<repo>/). Astro's
// configured `base` is exposed at build/runtime via `import.meta.env.BASE_URL`,
// which is always a string ending in '/' ('/' at the root, '/incidents/' under
// a subpath). Every internal href/asset must be routed through `withBase()` so
// it resolves correctly regardless of where the site is mounted.

/** Astro's configured base, normalised to end with a single '/'. */
const RAW_BASE = import.meta.env.BASE_URL ?? '/';
const BASE = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;

/**
 * Join an internal, root-relative path onto the site's base.
 *
 *   withBase('/')            -> '/'                 (base '/')   | '/incidents/'           (base '/incidents/')
 *   withBase('/incidents')   -> '/incidents'                    | '/incidents/incidents'
 *   withBase('/favicon.svg') -> '/favicon.svg'                  | '/incidents/favicon.svg'
 *
 * Absolute URLs (http(s)://, protocol-relative //, mailto:, #fragments) are
 * returned untouched — they are not internal site paths.
 */
export function withBase(path: string): string {
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(path) || // scheme: (http:, https:, mailto:, ...)
    path.startsWith('//') || // protocol-relative
    path.startsWith('#') // in-page fragment
  ) {
    return path;
  }
  const rel = path.startsWith('/') ? path.slice(1) : path;
  return BASE + rel;
}

/** The site's base path itself (always begins and ends with '/'). */
export const basePath = BASE;
