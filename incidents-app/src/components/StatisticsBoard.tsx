import TimeSeriesChart, { type TimePoint } from './charts/TimeSeriesChart';
import HorizontalBars, { type BarDatum } from './charts/HorizontalBars';
import { withBase } from '../lib/paths';

export interface StatisticsData {
  byJurisdiction: BarDatum[];
  byArea: BarDatum[];
  byType: BarDatum[];
  byBasis: BarDatum[];
  overTime: TimePoint[];
  timeGranularity: string; // "year" | "quarter"
  undated: number; // incidents excluded from the time chart (no incident date)
}

function Panel({
  title,
  filterKey,
  data,
}: {
  title: string;
  filterKey: string;
  data: BarDatum[];
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs text-ink-faint">Click a bar to view those incidents.</p>
      <div className="mt-4">
        <HorizontalBars
          data={data}
          ariaLabel={`Incidents by ${title.toLowerCase()}`}
          hrefFor={(d) => withBase(`/incidents?${filterKey}=${encodeURIComponent(d.value)}`)}
        />
      </div>
    </section>
  );
}

export default function StatisticsBoard({ data }: { data: StatisticsData }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5">
        <h3 className="font-display text-base font-semibold text-ink">
          Documented incidents over time
        </h3>
        <p className="mt-0.5 text-xs text-ink-faint">
          By {data.timeGranularity}, using the incident date where known.
        </p>
        <div className="mt-4">
          <TimeSeriesChart
            data={data.overTime}
            ariaLabel="Documented incidents over time"
            height={260}
          />
        </div>
        {data.undated > 0 && (
          <p className="mt-3 text-xs text-ink-faint">
            {data.undated} {data.undated === 1 ? 'incident has' : 'incidents have'} no recorded
            incident date and {data.undated === 1 ? 'is' : 'are'} not shown above. They remain
            searchable in the{' '}
            <a href={withBase('/incidents')} className="text-accent underline underline-offset-2 hover:text-accent-hover">
              browser
            </a>
            .
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Jurisdiction" filterKey="jurisdiction" data={data.byJurisdiction} />
        <Panel title="Area" filterKey="area" data={data.byArea} />
        <Panel title="Incident type" filterKey="type" data={data.byType} />
        <Panel title="Targeting basis" filterKey="basis" data={data.byBasis} />
      </div>
    </div>
  );
}
