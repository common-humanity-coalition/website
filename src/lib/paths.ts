// Base-path helpers, duplicated from the incident database site (the design
// source of truth). This site deploys at the domain root, so `base` is '/' and
// withBase() is effectively a no-op for root-relative paths — but routing every
// internal href/asset through it keeps the two codebases consistent and makes a
// future move to a subpath a config-only change.

/** Astro's configured base, normalised to end with a single '/'. */
const RAW_BASE = import.meta.env.BASE_URL ?? '/';
const BASE = RAW_BASE.endsWith('/') ? RAW_BASE : `${RAW_BASE}/`;

/**
 * Join an internal, root-relative path onto the site's base.
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
