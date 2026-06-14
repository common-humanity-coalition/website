import type { BrowseRecord } from '../../lib/types';
import { withBase } from '../../lib/paths';
import { institutionParts } from '../../lib/institution';

export type LabelMaps = {
  province: Record<string, string>;
  area: Record<string, string>;
  type: Record<string, string>;
  basis: Record<string, string>;
};

function humanise(value: string): string {
  const s = value.replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : value;
}

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});
function fmtDate(rec: BrowseRecord): string {
  const raw = rec.incident_date ?? rec.published_at.slice(0, 10);
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? 'Date unknown' : dateFmt.format(d);
}

function Chip({ children, tone }: { children: React.ReactNode; tone: 'accent' | 'neutral' }) {
  const cls =
    tone === 'accent'
      ? 'bg-accent-soft text-accent border-transparent'
      : 'bg-sand-100 text-ink-soft border-line';
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

export default function ResultCard({ rec, maps }: { rec: BrowseRecord; maps: LabelMaps }) {
  const lbl = (map: Record<string, string>, v: string) => map[v] ?? humanise(v);
  const inst = institutionParts(rec.institution_name);
  return (
    <article className="group relative rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_2px_18px_-8px_rgba(31,91,86,0.35)]">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center whitespace-nowrap rounded-full bg-ink px-2.5 py-0.5 font-medium text-paper">
          {rec.jurisdiction ? lbl(maps.province, rec.jurisdiction) : 'Unspecified'}
        </span>
        <span className="text-ink-faint">{fmtDate(rec)}</span>
      </div>

      {inst && inst.ancestors.length > 0 && (
        <p className="mt-2.5 text-xs leading-snug text-ink-faint break-words">
          {inst.ancestors.join(' › ')}
        </p>
      )}

      <h3
        className={`${inst && inst.ancestors.length > 0 ? 'mt-0.5' : 'mt-2.5'} font-display text-lg font-semibold leading-snug text-ink`}
      >
        <a
          href={withBase(`/incidents/${rec.id}`)}
          className="no-underline after:absolute after:inset-0 hover:text-accent"
        >
          {inst ? (
            <span className="relative break-words">{inst.leaf}</span>
          ) : (
            <span className="relative break-words italic text-ink-soft">Institution not named</span>
          )}
        </a>
      </h3>

      {rec.short_description && (
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{rec.short_description}</p>
      )}

      <div className="relative mt-3.5 flex flex-wrap gap-1.5">
        {rec.area && <Chip tone="accent">{lbl(maps.area, rec.area)}</Chip>}
        {rec.incident_type && <Chip tone="neutral">{lbl(maps.type, rec.incident_type)}</Chip>}
        {rec.targeting_basis.map((b) => (
          <Chip key={b} tone="neutral">
            {lbl(maps.basis, b)}
          </Chip>
        ))}
      </div>
    </article>
  );
}
