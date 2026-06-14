// Parse a possibly-hierarchical institution_name. Some incidents carry a
// " > "-delimited path placing the institution in its (federal or other)
// hierarchy, e.g. "Government of Canada > Department of National Defence" or
// "Government of Canada > Department of Canadian Heritage > Canadian
// Radio-television and Telecommunications Commission". Others are a plain name.
//
// Kept dependency-free (no snapshot import) so it can be used inside the React
// browse island without bundling the data layer.

export interface InstitutionParts {
  /** Ancestor levels, outermost first (empty for a plain, un-pathed name). */
  ancestors: string[];
  /** The most-specific organisation — what to show as the title. */
  leaf: string;
}

/** Split an institution_name into its ancestors and leaf. Returns null for an
 * empty/whitespace name. A plain name yields `{ ancestors: [], leaf: name }`. */
export function institutionParts(value: string | null | undefined): InstitutionParts | null {
  if (!value || !value.trim()) return null;
  const segs = value
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
  if (segs.length === 0) return null;
  return { ancestors: segs.slice(0, -1), leaf: segs[segs.length - 1] };
}
