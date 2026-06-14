import { useEffect, useMemo, useRef, useState } from 'react';
import MiniSearch from 'minisearch';
import type { BrowseRecord, Vocabularies } from '../../lib/types';
import { UNSPECIFIED } from '../../lib/data';
import { withBase } from '../../lib/paths';
import { toCsv, downloadCsv } from '../../lib/csv';
import MultiSelect from './MultiSelect';
import ResultCard, { type LabelMaps } from './ResultCard';

/** Label for a filter value, resolving the UNSPECIFIED sentinel and falling
 * back to a humanised form for any value missing from the vocabulary map. */
function filterValueLabel(map: Record<string, string>, v: string): string {
  if (v === UNSPECIFIED) return 'Unspecified';
  return map[v] ?? v.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

interface Props {
  records: BrowseRecord[];
  vocabularies: Vocabularies;
}

const PAGE_SIZE = 25;

// 'relevance' only makes sense while a text query is active (it is MiniSearch's
// ranking order). With no query it is meaningless, so the sort control hides it
// and the date-based 'newest'/'oldest' apply.
type SortKey = 'relevance' | 'newest' | 'oldest';

interface FilterState {
  q: string;
  jurisdiction: string[];
  area: string[];
  type: string[];
  basis: string[];
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  sort: SortKey;
  // True once the user has explicitly chosen a sort from the control. While
  // false, sort follows the query automatically: relevance while a query is
  // present, newest otherwise. A URL with an explicit ?sort= implies a choice.
  userSort: boolean;
}

const EMPTY: FilterState = {
  q: '',
  jurisdiction: [],
  area: [],
  type: [],
  basis: [],
  from: '',
  to: '',
  sort: 'newest',
  userSort: false,
};

function effectiveDate(rec: BrowseRecord): string {
  return rec.incident_date ?? rec.published_at.slice(0, 10);
}

// ---- URL <-> state -----------------------------------------------------------
function parseUrl(): FilterState {
  if (typeof window === 'undefined') return { ...EMPTY };
  const p = new URLSearchParams(window.location.search);
  const list = (k: string) => p.getAll(k).flatMap((v) => v.split(',')).filter(Boolean);
  const q = p.get('q') ?? '';
  // An explicit ?sort= (newest|oldest) is a deliberate user choice. 'relevance'
  // is never written to the URL — it is the implicit default while searching —
  // so its absence with a query present means "follow the query".
  const sortParam = p.get('sort');
  const userSort = sortParam === 'newest' || sortParam === 'oldest';
  const sort: SortKey = userSort
    ? (sortParam as SortKey)
    : q.trim()
    ? 'relevance'
    : 'newest';
  return {
    q,
    jurisdiction: list('jurisdiction'),
    area: list('area'),
    type: list('type'),
    basis: list('basis'),
    from: p.get('from') ?? '',
    to: p.get('to') ?? '',
    sort,
    userSort,
  };
}

function toQuery(s: FilterState): string {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set('q', s.q.trim());
  for (const v of s.jurisdiction) p.append('jurisdiction', v);
  for (const v of s.area) p.append('area', v);
  for (const v of s.type) p.append('type', v);
  for (const v of s.basis) p.append('basis', v);
  if (s.from) p.set('from', s.from);
  if (s.to) p.set('to', s.to);
  // Only persist an explicit, non-default sort. The contextual default
  // ('relevance' while searching, 'newest' otherwise) is left implicit, and
  // 'relevance' is never written — it is reconstructed from the query on load.
  if (s.userSort && (s.sort === 'newest' || s.sort === 'oldest')) {
    const contextualDefault = s.q.trim() ? 'relevance' : 'newest';
    if (s.sort !== contextualDefault) p.set('sort', s.sort);
  }
  const str = p.toString();
  return str ? `?${str}` : window.location.pathname;
}

export default function BrowseExplorer({ records, vocabularies }: Props) {
  const [state, setState] = useState<FilterState>(() => parseUrl());
  const [page, setPage] = useState(1);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Label maps for rendering.
  const maps: LabelMaps = useMemo(() => {
    const m = (terms: { value: string; label: string }[]) =>
      Object.fromEntries(terms.map((t) => [t.value, t.label]));
    return {
      province: m(vocabularies.provinces),
      area: m(vocabularies.areas),
      type: m(vocabularies.incident_types),
      basis: m(vocabularies.targeting_bases),
    };
  }, [vocabularies]);

  // Build the MiniSearch index once.
  const mini = useMemo(() => {
    const ms = new MiniSearch<BrowseRecord>({
      idField: 'id',
      fields: ['institution_name', 'short_description', 'search_text'],
      storeFields: ['id'],
      searchOptions: {
        boost: { institution_name: 3, short_description: 2 },
        prefix: true,
        fuzzy: 0.2,
        combineWith: 'AND',
      },
    });
    ms.addAll(records);
    return ms;
  }, [records]);

  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);

  // Keep URL in sync (replaceState so the back button isn't spammed).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = toQuery(state);
    window.history.replaceState(null, '', url);
  }, [state]);

  // Respond to back/forward navigation.
  useEffect(() => {
    function onPop() {
      setState(parseUrl());
      setPage(1);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Reset to first page whenever filters change.
  useEffect(() => {
    setPage(1);
  }, [state.q, state.jurisdiction, state.area, state.type, state.basis, state.from, state.to, state.sort]);

  // ---- Compute results -------------------------------------------------------
  const results = useMemo(() => {
    let base: BrowseRecord[];
    if (state.q.trim()) {
      const hits = mini.search(state.q.trim());
      base = hits.map((h) => byId.get(h.id as string)).filter(Boolean) as BrowseRecord[];
    } else {
      base = records;
    }

    // A selection may include UNSPECIFIED ("__none__"), which matches incidents
    // where this dimension is null/absent (e.g. arriving from a statistics
    // "Unspecified" bar). Otherwise a normal value-membership test.
    const inSet = (sel: string[], v: string | null) =>
      sel.length === 0 ||
      (v != null && sel.includes(v)) ||
      (v == null && sel.includes(UNSPECIFIED));
    const basisMatch = (sel: string[], arr: string[]) =>
      sel.length === 0 || arr.some((b) => sel.includes(b));

    const filtered = base.filter((r) => {
      if (!inSet(state.jurisdiction, r.jurisdiction)) return false;
      if (!inSet(state.area, r.area)) return false;
      if (!inSet(state.type, r.incident_type)) return false;
      if (!basisMatch(state.basis, r.targeting_basis)) return false;
      // Date-range filters apply to the true incident date; undated incidents
      // have no date to compare against, so a range filter excludes them.
      if (state.from || state.to) {
        if (!r.incident_date) return false;
        if (state.from && r.incident_date < state.from) return false;
        if (state.to && r.incident_date > state.to) return false;
      }
      return true;
    });

    // 'relevance' keeps MiniSearch's ranking order (only valid while a query is
    // present); 'newest'/'oldest' sort by date. Incidents with an unknown
    // incident_date always sort last (their date is genuinely unknown, not
    // "very old" or "very new"). With no query, relevance has no meaning, so any
    // non-date sort falls through to the date sort below.
    if (state.sort !== 'relevance' || !state.q.trim()) {
      filtered.sort((a, b) => {
        const aUndated = !a.incident_date;
        const bUndated = !b.incident_date;
        if (aUndated !== bUndated) return aUndated ? 1 : -1;
        if (aUndated && bUndated) {
          // Both undated: keep a stable order by publication date (newest first).
          const pa = a.published_at;
          const pb = b.published_at;
          return pa < pb ? 1 : pa > pb ? -1 : 0;
        }
        const da = effectiveDate(a);
        const db = effectiveDate(b);
        return state.sort === 'oldest' ? (da < db ? -1 : da > db ? 1 : 0) : da < db ? 1 : da > db ? -1 : 0;
      });
    }
    return filtered;
  }, [state, mini, byId, records]);

  // Announce result count to screen readers.
  useEffect(() => {
    if (liveRef.current) {
      liveRef.current.textContent = `${results.length} ${results.length === 1 ? 'incident' : 'incidents'} found.`;
    }
  }, [results.length]);

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const clampedPage = Math.min(page, pageCount);
  const pageItems = results.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  // ---- Active filter chips ---------------------------------------------------
  type Chip = { key: string; label: string; clear: () => void };
  const chips: Chip[] = [];
  const set = (patch: Partial<FilterState>) => setState((s) => ({ ...s, ...patch }));
  const removeFrom = (k: keyof FilterState, v: string) =>
    set({ [k]: (state[k] as string[]).filter((x) => x !== v) } as Partial<FilterState>);

  // Setting the query also moves sort between its contextual defaults, unless
  // the user has explicitly pinned a sort. Entering a query defaults to
  // relevance; clearing it reverts to newest. An explicit 'relevance' choice
  // can't survive an empty query, so clearing always drops it back to newest.
  const setQuery = (q: string) =>
    setState((s) => {
      const hasQuery = q.trim() !== '';
      let sort = s.sort;
      if (!s.userSort) {
        sort = hasQuery ? 'relevance' : 'newest';
      } else if (!hasQuery && s.sort === 'relevance') {
        sort = 'newest';
      }
      return { ...s, q, sort };
    });

  // Explicit sort choice from the control. Picking the contextual default while
  // searching ('relevance') is treated as releasing the pin, so the control
  // resumes following the query.
  const setSort = (sort: SortKey) =>
    setState((s) => ({
      ...s,
      sort,
      userSort: !(s.q.trim() !== '' && sort === 'relevance'),
    }));

  if (state.q.trim()) chips.push({ key: 'q', label: `Search: “${state.q.trim()}”`, clear: () => setQuery('') });
  for (const v of state.jurisdiction)
    chips.push({ key: `j-${v}`, label: `Jurisdiction: ${filterValueLabel(maps.province, v)}`, clear: () => removeFrom('jurisdiction', v) });
  for (const v of state.area)
    chips.push({ key: `a-${v}`, label: `Area: ${filterValueLabel(maps.area, v)}`, clear: () => removeFrom('area', v) });
  for (const v of state.type)
    chips.push({ key: `t-${v}`, label: `Type: ${filterValueLabel(maps.type, v)}`, clear: () => removeFrom('type', v) });
  for (const v of state.basis)
    chips.push({ key: `b-${v}`, label: `Basis: ${filterValueLabel(maps.basis, v)}`, clear: () => removeFrom('basis', v) });
  if (state.from) chips.push({ key: 'from', label: `From ${state.from}`, clear: () => set({ from: '' }) });
  if (state.to) chips.push({ key: 'to', label: `To ${state.to}`, clear: () => set({ to: '' }) });

  const hasFilters = chips.length > 0;

  // Export every incident matching the current filters (the full result set,
  // not just the paginated page on screen) as a CSV of the browse-card fields.
  // Values use the same human-readable labels shown on the cards; each row links
  // back to the incident's page.
  const downloadResults = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const header = [
      'ID',
      'Incident date',
      'Institution',
      'Jurisdiction',
      'Area',
      'Incident type',
      'Targeting basis',
      'Short description',
      'URL',
    ];
    const rows = results.map((r) => [
      r.id,
      r.incident_date ?? '',
      r.institution_name ?? '',
      r.jurisdiction ? filterValueLabel(maps.province, r.jurisdiction) : '',
      r.area ? filterValueLabel(maps.area, r.area) : '',
      r.incident_type ? filterValueLabel(maps.type, r.incident_type) : '',
      r.targeting_basis.map((b) => filterValueLabel(maps.basis, b)).join('; '),
      r.short_description ?? '',
      origin + withBase(`/incidents/${r.id}`),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`common-humanity-incidents-${stamp}.csv`, toCsv([header, ...rows]));
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      {/* ---- Filter rail ---- */}
      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
        <form
          className="space-y-4 rounded-xl border border-line bg-surface p-4"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
          <div>
            <label htmlFor="q" className="mb-1 block text-xs font-semibold text-ink-soft">
              Search
            </label>
            <input
              id="q"
              type="search"
              value={state.q}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Institution, description, quotes…"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent-ring"
            />
          </div>

          <MultiSelect
            label="Jurisdiction"
            options={vocabularies.provinces}
            selected={state.jurisdiction}
            onChange={(v) => set({ jurisdiction: v })}
          />
          <MultiSelect
            label="Area"
            options={vocabularies.areas}
            selected={state.area}
            onChange={(v) => set({ area: v })}
          />
          <MultiSelect
            label="Incident type"
            options={vocabularies.incident_types}
            selected={state.type}
            onChange={(v) => set({ type: v })}
          />
          <MultiSelect
            label="Targeting basis"
            options={vocabularies.targeting_bases}
            selected={state.basis}
            onChange={(v) => set({ basis: v })}
          />

          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 block text-xs font-semibold text-ink-soft">Date range</legend>
            <label className="text-[11px] text-ink-faint">
              From
              <input
                type="date"
                value={state.from}
                max={state.to || undefined}
                onChange={(e) => set({ from: e.target.value })}
                className="mt-0.5 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent-ring"
              />
            </label>
            <label className="text-[11px] text-ink-faint">
              To
              <input
                type="date"
                value={state.to}
                min={state.from || undefined}
                onChange={(e) => set({ to: e.target.value })}
                className="mt-0.5 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent-ring"
              />
            </label>
          </fieldset>

          <div>
            <label htmlFor="sort" className="mb-1 block text-xs font-semibold text-ink-soft">
              Sort
            </label>
            <select
              id="sort"
              value={state.sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent-ring"
            >
              {/* Relevance is only meaningful (and only offered) while a text
                  query is active. */}
              {state.q.trim() && <option value="relevance">Relevance</option>}
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => setState({ ...EMPTY })}
              className="w-full rounded-md border border-line px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-accent-ring hover:text-accent"
            >
              Clear all filters
            </button>
          )}
        </form>

        {/* Download the currently filtered incidents as CSV. */}
        <button
          type="button"
          onClick={downloadResults}
          disabled={results.length === 0}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M10 3.5V12M6.75 8.75 10 12l3.25-3.25M4.5 15.5h11" />
          </svg>
          Download {results.length} {results.length === 1 ? 'incident' : 'incidents'}
        </button>
        <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-ink-faint">
          CSV of every incident matching your filters (not just this page).
        </p>
      </aside>

      {/* ---- Results ---- */}
      <section aria-label="Results">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft" aria-hidden="true">
            <strong className="text-ink">{results.length}</strong>{' '}
            {results.length === 1 ? 'incident' : 'incidents'}
            {hasFilters
              ? results.length === 1
                ? ' matches your filters'
                : ' match your filters'
              : ' documented'}
          </p>
          <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />
        </div>

        {hasFilters && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.clear}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-sand-50 px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent-ring hover:text-accent"
              >
                {c.label}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setState({ ...EMPTY })}
              className="text-xs font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
            >
              Clear all
            </button>
          </div>
        )}

        {pageItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50 p-10 text-center">
            <p className="font-display text-lg font-semibold text-ink">No incidents match</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              Try removing a filter, broadening the date range, or searching for a different term.
              The database documents a curated set of incidents, so not every query will return a
              result.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => setState({ ...EMPTY })}
                className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {pageItems.map((rec) => (
                <ResultCard key={rec.id} rec={rec} maps={maps} />
              ))}
            </div>

            {pageCount > 1 && (
              <nav
                className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-5"
                aria-label="Pagination"
              >
                <button
                  type="button"
                  disabled={clampedPage <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft enabled:hover:border-accent-ring enabled:hover:text-accent disabled:opacity-40"
                >
                  ← Previous
                </button>
                <span className="text-sm text-ink-faint">
                  Page {clampedPage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={clampedPage >= pageCount}
                  onClick={() => {
                    setPage((p) => Math.min(pageCount, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-soft enabled:hover:border-accent-ring enabled:hover:text-accent disabled:opacity-40"
                >
                  Next →
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
