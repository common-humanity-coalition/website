import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CHART } from './chartTheme';

export interface TimePoint {
  period: string;
  count: number;
}

interface Props {
  data: TimePoint[];
  height?: number;
  /** When set, the period label appears as an accessible caption. */
  ariaLabel?: string;
}

export default function TimeSeriesChart({ data, height = 240, ariaLabel }: Props) {
  return (
    <figure className="m-0" role="group" aria-label={ariaLabel ?? 'Incidents over time'}>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: CHART.grid }}
              // Show every period label. With a continuous axis (gaps filled with
              // zero) the default thinning would hide whole years on narrow
              // screens; angle the labels so they all fit without overlapping.
              interval={0}
              angle={-45}
              textAnchor="end"
              height={48}
              tickMargin={4}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: 'rgba(31,91,86,0.06)' }}
              contentStyle={{
                background: CHART.tooltipBg,
                border: `1px solid ${CHART.tooltipBorder}`,
                borderRadius: 8,
                fontSize: 12,
                color: CHART.text,
              }}
              labelStyle={{ color: CHART.text, fontWeight: 600 }}
              formatter={(value: number) => [`${value}`, 'Incidents']}
            />
            <Bar dataKey="count" fill={CHART.bar} radius={[3, 3, 0, 0]} maxBarSize={46} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
