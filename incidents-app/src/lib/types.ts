// Types mirror the data contract (version 1). See public_site/README.md.

export interface VocabTerm {
  value: string;
  label: string;
}

export interface Vocabularies {
  provinces: VocabTerm[];
  areas: VocabTerm[];
  incident_types: VocabTerm[];
  targeting_bases: VocabTerm[];
}

export interface Quote {
  text: string;
  rationale: string | null;
}

export interface Incident {
  id: string;
  incident_date: string | null; // YYYY-MM-DD
  published_at: string; // ISO 8601 UTC
  jurisdiction: string | null; // null when the entry names no jurisdiction
  institution_name: string | null; // null when the entry names no institution
  area: string | null;
  incident_type: string | null;
  targeting_basis: string[];
  short_description: string | null;
  description_of_event: string | null;
  expected_harm: string | null;
  solution: string | null;
  quotes: Quote[];
  source_urls: string[];
  // Coarse origin: "monitored" for incidents auto-ingested from a systematically
  // monitored public source (e.g. Government of Canada / University Affairs job
  // postings), "community" for member submissions.
  provenance: 'community' | 'monitored';
}

export interface Snapshot {
  version: number;
  generated_at: string; // ISO 8601 UTC
  vocabularies: Vocabularies;
  incidents: Incident[];
}

// A lean record for the browse/search island. Narratives are summarised into a
// single search blob to keep the client payload small.
export interface BrowseRecord {
  id: string;
  institution_name: string | null;
  jurisdiction: string | null;
  area: string | null;
  incident_type: string | null;
  targeting_basis: string[];
  short_description: string | null;
  incident_date: string | null;
  published_at: string;
  // Concatenated text used only to build the MiniSearch index (not displayed).
  search_text: string;
}
