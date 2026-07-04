import { useState } from 'react';
import HorizontalBars, { type BarDatum } from './charts/HorizontalBars';
import { CHART } from './charts/chartTheme';
import { withBase } from '../lib/paths';

export interface StatisticsData {
  byJurisdiction: BarDatum[];
  byArea: BarDatum[];
  byType: BarDatum[];
  byBasis: BarDatum[];
}

function Panel({
  title,
  filterKey,
  data,
  stacked,
}: {
  title: string;
  filterKey: string;
  data: BarDatum[];
  stacked: boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs text-ink-faint">Click a bar to view those incidents.</p>
      <div className="mt-4">
        <HorizontalBars
          data={data}
          stacked={stacked}
          ariaLabel={`Incidents by ${title.toLowerCase()}`}
          hrefFor={(d) => withBase(`/incidents?${filterKey}=${encodeURIComponent(d.value)}`)}
        />
      </div>
    </section>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: color }}
        aria-hidden="true"
      />
      <span className="text-ink-soft">{label}</span>
    </span>
  );
}

export default function StatisticsBoard({ data }: { data: StatisticsData }) {
  const [showSplit, setShowSplit] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#1f5b56]"
            checked={showSplit}
            onChange={(e) => setShowSplit(e.target.checked)}
          />
          Show community vs monitored split
        </label>
        {showSplit && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <Swatch color={CHART.bar} label="Community submissions" />
            <Swatch color={CHART.barMuted} label="Monitored sources" />
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Jurisdiction" filterKey="jurisdiction" data={data.byJurisdiction} stacked={showSplit} />
        <Panel title="Area" filterKey="area" data={data.byArea} stacked={showSplit} />
        <Panel title="Incident type" filterKey="type" data={data.byType} stacked={showSplit} />
        <Panel title="Targeting basis" filterKey="basis" data={data.byBasis} stacked={showSplit} />
      </div>
    </div>
  );
}
