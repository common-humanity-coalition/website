// Shared site metadata, ported from the Hugo config (config/_default/).

/** The coalition's public Incident Database (outbound link). */
export const INCIDENT_DB_URL =
  'https://common-humanity-coalition.github.io/incidents/';

/**
 * Default meta description.
 * Ported verbatim from the Hugo `marketing.seo.description` in params.yaml.
 */
export const SITE_DESCRIPTION =
  'Discover a movement dedicated to uniting people through our shared human experiences. The Common Humanity Coalition fosters understanding, celebrates individuality, and inspires collaboration amongst Canadians. Join our vibrant community striving for mutual respect and progress on our collective journey.';

/** Mission one-liner, ported from the homepage hero copy. */
export const MISSION_ONELINER =
  'We advocate for change in institutions across Canada to create a society where individual uniqueness is celebrated and our shared humanity guides policy decisions.';

/**
 * Content licence, ported from the Hugo footer config (params.yaml):
 *   allow_derivatives: false, share_alike: false, allow_commercial: false
 * which is Creative Commons Attribution-NonCommercial-NoDerivatives 4.0.
 */
export const LICENCE = {
  label: 'CC BY-NC-ND 4.0',
  name: 'Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International',
  url: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
};
