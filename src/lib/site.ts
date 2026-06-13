// Shared site metadata, ported from the Hugo config (config/_default/).

/** The coalition's public Incident Database (served as a subdirectory of this site). */
export const INCIDENT_DB_URL = 'https://commonhumanity.us/incidents/';

/**
 * Formspree contact-form endpoint, reinstated from the previous Hugo site.
 * The form ID (`xgveqoan`) is the owner's existing Formspree form; the contact
 * page POSTs submissions here. Kept here so the endpoint/ID lives alongside the
 * other site constants rather than being hard-coded in the page.
 */
export const FORMSPREE_FORM_ID = 'xgveqoan';
export const FORMSPREE_ENDPOINT = `https://formspree.io/f/${FORMSPREE_FORM_ID}`;

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
