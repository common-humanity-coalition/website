import { useState } from 'react';
import { CHART } from './chartTheme';

export interface BarDatum {
  value: string;
  label: string;
  count: number;
  // Optional provenance split of `count`. When present and `stacked` is on, the
  // bar is drawn as two segments (community + monitored). community + monitored
  // should equal count.
  community?: number;
  monitored?: number;
}

interface Props {
  data: BarDatum[];
  /** Builds a link for clicking a bar (cross-filter into /incidents). */
  hrefFor?: (d: BarDatum) => string;
  /** Accessible name for the whole group. */
  ariaLabel: string;
  /** Cap the number of rows; remainder summarised. */
  maxRows?: number;
  /** Draw each bar split into community (deep) + monitored (muted) segments. */
  stacked?: boolean;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  lines: string[];
}

/**
 * Lightweight, dependency-free horizontal bar list. Sorted desc by the caller.
 * Rendered as semantic markup (not an SVG canvas) so it is fully accessible and
 * keyboard-navigable when bars are links. On hover it shows a cursor-following
 * tooltip with the bar's count; over a stacked bar the tooltip reflects whichever
 * segment (community / monitored) the cursor is on. Hover is a pointer-only
 * affordance; the same counts are always present in each bar's aria-label.
 */
export default function HorizontalBars({ data, hrefFor, ariaLabel, maxRows, stacked }: Props) {
  const rows = typeof maxRows === 'number' ? data.slice(0, maxRows) : data;
  const max = Math.max(1, ...rows.map((d) => d.count));

  const [tip, setTip] = useState<Tip | null>(null);
  const showTip = (e: { clientX: number; clientY: number }, title: string, lines: string[]) =>
    setTip({ x: e.clientX, y: e.clientY, title, lines });
  const hideTip = () => setTip(null);

  return (
    <>
      <ul className="m-0 list-none space-y-2 p-0" aria-label={ariaLabel}>
        {rows.map((d) => {
          const pct = Math.round((d.count / max) * 100);
          const community = d.community ?? 0;
          const monitored = d.monitored ?? 0;
          const hasSplit = stacked && (d.community != null || d.monitored != null);
          const commPct = (community / max) * 100;
          const monPct = (monitored / max) * 100;
          const label = hasSplit
            ? `${d.label}: ${d.count} incidents (community ${community}, monitored ${monitored}).`
            : `${d.label}: ${d.count} incidents.`;
          const track = hasSplit ? (
            <div className="relative flex h-6 flex-1 overflow-hidden rounded bg-sand-100" onMouseLeave={hideTip}>
              <div
                className="h-full transition-[width]"
                style={{ width: `${commPct}%`, background: CHART.bar }}
                onMouseMove={(e) => showTip(e, d.label, [`Community: ${community}`, `${d.count} total`])}
              />
              <div
                className="h-full transition-[width]"
                style={{ width: `${monPct}%`, background: CHART.barMuted }}
                onMouseMove={(e) => showTip(e, d.label, [`Monitored: ${monitored}`, `${d.count} total`])}
              />
            </div>
          ) : (
            <div
              className="relative h-6 flex-1 overflow-hidden rounded bg-sand-100"
              onMouseMove={(e) => showTip(e, d.label, [`${d.count} incidents`])}
              onMouseLeave={hideTip}
            >
              <div
                className="h-full rounded transition-[width]"
                style={{ width: `${pct}%`, background: CHART.bar, minWidth: d.count ? 4 : 0 }}
              />
            </div>
          );
          const inner = (
            <div className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm text-ink-soft sm:w-48" title={d.label}>
                {d.label}
              </div>
              {track}
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
                  aria-label={`${label} Filter the database by this value.`}
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
      {tip && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: tip.x + 12,
            top: tip.y + 12,
            background: CHART.tooltipBg,
            borderColor: CHART.tooltipBorder,
            color: CHART.text,
          }}
          role="status"
        >
          <div className="font-semibold" style={{ color: CHART.text }}>
            {tip.title}
          </div>
          {tip.lines.map((line, i) => (
            <div key={i} className={i === 0 ? 'tabular-nums' : 'tabular-nums text-ink-faint'}>
              {line}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
