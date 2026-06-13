import { CHART } from './chartTheme';

export interface BarDatum {
  value: string;
  label: string;
  count: number;
}

interface Props {
  data: BarDatum[];
  /** Builds a link for clicking a bar (cross-filter into /incidents). */
  hrefFor?: (d: BarDatum) => string;
  /** Accessible name for the whole group. */
  ariaLabel: string;
  /** Cap the number of rows; remainder summarised. */
  maxRows?: number;
}

/**
 * Lightweight, dependency-free horizontal bar list. Sorted desc by the caller.
 * Rendered as semantic markup (not an SVG canvas) so it is fully accessible and
 * keyboard-navigable when bars are links.
 */
export default function HorizontalBars({ data, hrefFor, ariaLabel, maxRows }: Props) {
  const rows = typeof maxRows === 'number' ? data.slice(0, maxRows) : data;
  const max = Math.max(1, ...rows.map((d) => d.count));

  return (
    <ul className="m-0 list-none space-y-2 p-0" aria-label={ariaLabel}>
      {rows.map((d) => {
        const pct = Math.round((d.count / max) * 100);
        const inner = (
          <div className="flex items-center gap-3">
            <div className="w-40 shrink-0 truncate text-sm text-ink-soft sm:w-48" title={d.label}>
              {d.label}
            </div>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-sand-100">
              <div
                className="h-full rounded transition-[width]"
                style={{ width: `${pct}%`, background: CHART.bar, minWidth: d.count ? 4 : 0 }}
              />
            </div>
            <div className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-ink">
              {d.count}
            </div>
          </div>
        );
        return (
          <li key={d.value}>
            {hrefFor ? (
              <a
                href={hrefFor(d)}
                className="block rounded px-1 py-0.5 no-underline transition-colors hover:bg-sand-50"
                aria-label={`${d.label}: ${d.count} incidents. Filter the database by this value.`}
              >
                {inner}
              </a>
            ) : (
              <div className="px-1 py-0.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
