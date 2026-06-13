// Loads + validates the build-time snapshot and exposes typed helpers.
// Validation failures throw, which fails the Astro build loudly — that is the
// intended behaviour for a contract violation.

import rawSnapshot from '../../data/snapshot.json';
import type {
  Snapshot,
  Incident,
  Vocabularies,
  VocabTerm,
  BrowseRecord,
} from './types';

const SUPPORTED_VERSION = 1;

function fail(msg: string): never {
  throw new Error(`[snapshot] contract violation: ${msg}`);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function validateVocab(name: string, terms: unknown): VocabTerm[] {
  if (!Array.isArray(terms)) fail(`vocabularies.${name} is not an array`);
  return (terms as unknown[]).map((t, i) => {
    if (typeof t !== 'object' || t === null) fail(`vocabularies.${name}[${i}] is not an object`);
    const term = t as Record<string, unknown>;
    if (typeof term.value !== 'string') fail(`vocabularies.${name}[${i}].value missing/not a string`);
    if (typeof term.label !== 'string') fail(`vocabularies.${name}[${i}].label missing/not a string`);
    return { value: term.value, label: term.label };
  });
}

function validateIncident(inc: unknown, i: number): Incident {
  if (typeof inc !== 'object' || inc === null) fail(`incidents[${i}] is not an object`);
  const o = inc as Record<string, unknown>;

  if (typeof o.id !== 'string' || o.id.length === 0) fail(`incidents[${i}].id missing/empty`);
  if (o.incident_date !== null && typeof o.incident_date !== 'string')
    fail(`incidents[${i}].incident_date must be string|null`);
  if (typeof o.published_at !== 'string') fail(`incidents[${i}].published_at missing/not a string`);
  // jurisdiction may legitimately be null (the DB column is nullable and the
  // exporter emits null for entries that name no jurisdiction). Empty /
  // whitespace-only strings are normalised to null below.
  if (o.jurisdiction !== null && typeof o.jurisdiction !== 'string')
    fail(`incidents[${i}].jurisdiction must be string|null`);
  // institution_name may legitimately be null (some published entries name no
  // institution). Empty / whitespace-only strings are normalised to null below.
  if (o.institution_name !== null && typeof o.institution_name !== 'string')
    fail(`incidents[${i}].institution_name must be string|null`);
  if (o.area !== null && typeof o.area !== 'string') fail(`incidents[${i}].area must be string|null`);
  if (o.incident_type !== null && typeof o.incident_type !== 'string')
    fail(`incidents[${i}].incident_type must be string|null`);
  if (!isStringArray(o.targeting_basis)) fail(`incidents[${i}].targeting_basis must be string[]`);

  const optText = (k: string) => {
    const v = o[k];
    if (v !== null && typeof v !== 'string') fail(`incidents[${i}].${k} must be string|null`);
    return (v as string | null) ?? null;
  };

  if (!Array.isArray(o.quotes)) fail(`incidents[${i}].quotes must be an array`);
  const quotes = (o.quotes as unknown[]).map((q, qi) => {
    if (typeof q !== 'object' || q === null) fail(`incidents[${i}].quotes[${qi}] is not an object`);
    const qo = q as Record<string, unknown>;
    if (typeof qo.text !== 'string') fail(`incidents[${i}].quotes[${qi}].text missing/not a string`);
    if (qo.rationale != null && typeof qo.rationale !== 'string')
      fail(`incidents[${i}].quotes[${qi}].rationale must be string|null`);
    return { text: qo.text, rationale: (qo.rationale as string | null) ?? null };
  });

  if (!isStringArray(o.source_urls)) fail(`incidents[${i}].source_urls must be string[]`);

  // Normalise blank / whitespace-only institution names to null so "not named"
  // is represented one way everywhere (display, counts, search).
  const instRaw = o.institution_name as string | null;
  const institution_name = instRaw != null && instRaw.trim() !== '' ? instRaw : null;

  // Same normalisation for jurisdiction (blank / whitespace-only -> null).
  const jurRaw = o.jurisdiction as string | null;
  const jurisdiction = jurRaw != null && jurRaw.trim() !== '' ? jurRaw : null;

  return {
    id: o.id,
    incident_date: (o.incident_date as string | null) ?? null,
    published_at: o.published_at,
    jurisdiction,
    institution_name,
    area: (o.area as string | null) ?? null,
    incident_type: (o.incident_type as string | null) ?? null,
    targeting_basis: o.targeting_basis,
    short_description: optText('short_description'),
    description_of_event: optText('description_of_event'),
    expected_harm: optText('expected_harm'),
    solution: optText('solution'),
    quotes,
    source_urls: o.source_urls,
  };
}

function validate(raw: unknown): Snapshot {
  if (typeof raw !== 'object' || raw === null) fail('root is not an object');
  const o = raw as Record<string, unknown>;
  if (o.version !== SUPPORTED_VERSION)
    fail(`unsupported version ${String(o.version)} (expected ${SUPPORTED_VERSION})`);
  if (typeof o.generated_at !== 'string') fail('generated_at missing/not a string');
  if (typeof o.vocabularies !== 'object' || o.vocabularies === null) fail('vocabularies missing');
  const v = o.vocabularies as Record<string, unknown>;
  const vocabularies: Vocabularies = {
    provinces: validateVocab('provinces', v.provinces),
    areas: validateVocab('areas', v.areas),
    incident_types: validateVocab('incident_types', v.incident_types),
    targeting_bases: validateVocab('targeting_bases', v.targeting_bases),
  };
  if (!Array.isArray(o.incidents)) fail('incidents is not an array');
  const incidents = (o.incidents as unknown[]).map((inc, i) => validateIncident(inc, i));

  // Uniqueness of ids (detail pages key on id).
  const seen = new Set<string>();
  for (const inc of incidents) {
    if (seen.has(inc.id)) fail(`duplicate incident id ${inc.id}`);
    seen.add(inc.id);
  }

  return { version: SUPPORTED_VERSION, generated_at: o.generated_at, vocabularies, incidents };
}

// Validate once at module load (build time).
export const snapshot: Snapshot = validate(rawSnapshot as unknown);
export const incidents: Incident[] = snapshot.incidents;
export const vocabularies: Vocabularies = snapshot.vocabularies;
export const generatedAt: string = snapshot.generated_at;

// ---- Label lookup helpers --------------------------------------------------

function buildMap(terms: VocabTerm[]): Map<string, string> {
  return new Map(terms.map((t) => [t.value, t.label]));
}
const provinceMap = buildMap(vocabularies.provinces);
const areaMap = buildMap(vocabularies.areas);
const typeMap = buildMap(vocabularies.incident_types);
const basisMap = buildMap(vocabularies.targeting_bases);

// Humanise an unknown value gracefully (snake_case -> "Snake case").
function humanise(value: string): string {
  const s = value.replace(/_/g, ' ').trim();
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : value;
}

export function provinceLabel(value: string | null | undefined): string {
  if (!value) return 'Unspecified';
  return provinceMap.get(value) ?? humanise(value);
}
export function areaLabel(value: string | null | undefined): string {
  if (!value) return 'Unspecified';
  return areaMap.get(value) ?? humanise(value);
}
export function typeLabel(value: string | null | undefined): string {
  if (!value) return 'Unspecified';
  return typeMap.get(value) ?? humanise(value);
}
export function basisLabel(value: string | null | undefined): string {
  if (!value) return 'Unspecified';
  return basisMap.get(value) ?? humanise(value);
}

/** Display name for an incident's institution; a stable fallback when unnamed. */
export const UNNAMED_INSTITUTION = 'Institution not named';
export function institutionDisplay(value: string | null | undefined): string {
  return value && value.trim() ? value : UNNAMED_INSTITUTION;
}

// ---- Filter-option vocabularies (used values only) -------------------------
// Browse filters and statistics categories are derived from values that appear
// on at least one incident in this snapshot — not the raw vocabulary lists, so
// no dropdown ever offers an option that matches zero incidents. Labels come
// from the vocabulary map; a value present on incidents but absent from the
// vocabulary still renders via a humanised fallback (never crashes).

function usedTerms(
  values: Iterable<string>,
  map: Map<string, string>,
  vocabOrder: VocabTerm[]
): VocabTerm[] {
  const present = new Set<string>();
  for (const v of values) if (v) present.add(v);
  // Order: follow the vocabulary's curated order for known values, then any
  // unknown-but-present values appended alphabetically by humanised label.
  const known = vocabOrder.filter((t) => present.has(t.value));
  const knownValues = new Set(known.map((t) => t.value));
  const unknown = [...present]
    .filter((v) => !knownValues.has(v))
    .map((v) => ({ value: v, label: map.get(v) ?? humanise(v) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [...known, ...unknown];
}

/** Vocabularies restricted to values actually used by >=1 incident. */
export const usedVocabularies: Vocabularies = {
  provinces: usedTerms(
    incidents.map((i) => i.jurisdiction).filter((v): v is string => v != null),
    provinceMap,
    vocabularies.provinces
  ),
  areas: usedTerms(
    incidents.map((i) => i.area).filter((v): v is string => v != null),
    areaMap,
    vocabularies.areas
  ),
  incident_types: usedTerms(
    incidents.map((i) => i.incident_type).filter((v): v is string => v != null),
    typeMap,
    vocabularies.incident_types
  ),
  targeting_bases: usedTerms(
    incidents.flatMap((i) => i.targeting_basis),
    basisMap,
    vocabularies.targeting_bases
  ),
};

// ---- Date formatting (native Intl, no external libs) -----------------------

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
const monthYearFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** Format a YYYY-MM-DD or ISO string for display. Returns "Date unknown" for null. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Date unknown';
  // Accept both YYYY-MM-DD and full ISO.
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return 'Date unknown';
  return dateFmt.format(d);
}

export function formatMonthYear(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return value;
  return monthYearFmt.format(d);
}

/** The date used for sorting/recency: prefer incident_date, fall back to published_at. */
export function effectiveDate(inc: Incident): string {
  return inc.incident_date ?? inc.published_at.slice(0, 10);
}

// ---- Derived aggregates ----------------------------------------------------

export function totalIncidents(): number {
  return incidents.length;
}

export function jurisdictionsCovered(): number {
  return new Set(incidents.map((i) => i.jurisdiction).filter(Boolean)).size;
}

export function institutionsNamed(): number {
  return new Set(incidents.map((i) => i.institution_name).filter(Boolean)).size;
}

/** Inclusive [min, max] of effective dates, or null if no dated incidents. */
export function dateRange(): { min: string; max: string } | null {
  const dates = incidents.map(effectiveDate).filter(Boolean).sort();
  if (!dates.length) return null;
  return { min: dates[0], max: dates[dates.length - 1] };
}

export function mostRecent(n: number): Incident[] {
  return [...incidents]
    .sort((a, b) => (effectiveDate(a) < effectiveDate(b) ? 1 : -1))
    .slice(0, n);
}

export function getIncident(id: string): Incident | undefined {
  return incidents.find((i) => i.id === id);
}

/** Count incidents per value for a given dimension, sorted desc. */
export interface CountEntry {
  value: string;
  label: string;
  count: number;
}

// Sentinel filter value for "this dimension is null/absent on the incident".
// Used by both the statistics "Unspecified" bucket and the browse filters so a
// chart click and a filter chip agree on what they select.
export const UNSPECIFIED = '__none__';

function countBy(
  selector: (inc: Incident) => string[] | string | null,
  labeller: (v: string) => string,
  bucketNull = false
): CountEntry[] {
  const counts = new Map<string, number>();
  let nullCount = 0;
  for (const inc of incidents) {
    const raw = selector(inc);
    const values = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    if (values.length === 0) {
      nullCount++;
      continue;
    }
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const entries = [...counts.entries()]
    .map(([value, count]) => ({ value, label: labeller(value), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  // Bucket null/absent values into a single "Unspecified" entry, kept last so
  // the omission is honest rather than silent. Single-valued dimensions
  // (jurisdiction, area, type) bucket; multi-valued (targeting_basis) does not.
  if (bucketNull && nullCount > 0) {
    entries.push({ value: UNSPECIFIED, label: 'Unspecified', count: nullCount });
  }
  return entries;
}

export function countsByJurisdiction(): CountEntry[] {
  return countBy((i) => i.jurisdiction, provinceLabel, true);
}
export function countsByArea(): CountEntry[] {
  return countBy((i) => i.area, areaLabel, true);
}
export function countsByType(): CountEntry[] {
  return countBy((i) => i.incident_type, typeLabel, true);
}
export function countsByBasis(): CountEntry[] {
  return countBy((i) => i.targeting_basis, basisLabel);
}

/** Incidents whose incident_date is unknown (excluded from time charts). */
export function undatedCount(): number {
  return incidents.filter((i) => !i.incident_date).length;
}

/**
 * Incidents per calendar year, ascending. Buckets on the *true* incident_date
 * only — incidents with an unknown incident_date are excluded rather than
 * silently attributed to their publication year (which would be dishonest).
 * Use undatedCount() to surface how many were left out.
 */
export function countsByYear(): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const inc of incidents) {
    const d = inc.incident_date;
    if (!d) continue;
    const year = d.slice(0, 4);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  // Emit a *continuous* run of years from the earliest to the latest, filling
  // gaps with zero. A time axis must be continuous: dropping years that happen
  // to have no incidents (e.g. 2017, 2018) would silently compress the timeline
  // and misrepresent the trend.
  const yearNums = [...counts.keys()].map((y) => parseInt(y, 10));
  const min = Math.min(...yearNums);
  const max = Math.max(...yearNums);
  const out: { year: string; count: number }[] = [];
  for (let y = min; y <= max; y++) {
    const key = String(y);
    out.push({ year: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

/** Incidents per quarter (true incident_date), ascending. Returns e.g. "2023 Q2". */
export function countsByQuarter(): { quarter: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const inc of incidents) {
    const d = inc.incident_date;
    if (!d) continue;
    const year = parseInt(d.slice(0, 4), 10);
    const month = parseInt(d.slice(5, 7), 10);
    const q = Math.floor((month - 1) / 3) + 1;
    counts.set(`${year} Q${q}`, (counts.get(`${year} Q${q}`) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  // Continuous quarters from earliest to latest, filling empty quarters with
  // zero (same honesty rationale as countsByYear).
  const ordinals = [...counts.keys()].map((k) => {
    const [y, q] = k.split(' Q');
    return parseInt(y, 10) * 4 + (parseInt(q, 10) - 1);
  });
  const min = Math.min(...ordinals);
  const max = Math.max(...ordinals);
  const out: { quarter: string; count: number }[] = [];
  for (let o = min; o <= max; o++) {
    const key = `${Math.floor(o / 4)} Q${(o % 4) + 1}`;
    out.push({ quarter: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

// ---- Browse island payload -------------------------------------------------

/** Build the lean records shipped to the browse island (no full narratives). */
export function browseRecords(): BrowseRecord[] {
  return incidents.map((i) => ({
    id: i.id,
    institution_name: i.institution_name,
    jurisdiction: i.jurisdiction,
    area: i.area,
    incident_type: i.incident_type,
    targeting_basis: i.targeting_basis,
    short_description: i.short_description,
    incident_date: i.incident_date,
    published_at: i.published_at,
    // Search blob: institution + short desc + narrative + quotes, flattened.
    search_text: [
      i.institution_name ?? '',
      i.short_description ?? '',
      i.description_of_event ?? '',
      i.expected_harm ?? '',
      ...i.quotes.map((q) => q.text),
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  }));
}
