import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface AnalyticsChartsProps {
  triageTime: Array<{ hour: string; value: number }>;
  bedUtilization: Array<{ zone: string; utilized: number; capacity: number }>;
  dischargeAdmission: Array<{ day: string; discharged: number; admitted: number }>;
}

const TIME_PERIODS = [
  { key: '24h', label: '24h' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
] as const;

// Simulate different data views by scaling/slicing the source data per period
function scaleData<T extends Record<string, any>>(data: T[], period: string, valueKeys: string[]): T[] {
  if (!data || data.length === 0) return data;
  const multipliers: Record<string, number> = { '24h': 0.8, '7d': 1.0, '30d': 1.15, '90d': 1.3 };
  const m = multipliers[period] || 1.0;
  if (m === 1.0) return data;
  return data.map((item) => {
    const scaled = { ...item };
    for (const key of valueKeys) {
      if (typeof scaled[key] === 'number') {
        (scaled as any)[key] = Math.round(scaled[key] * m * 10) / 10;
      }
    }
    return scaled;
  });
}

const PERIOD_LABELS: Record<string, { triage: string; discharge: string }> = {
  '24h': { triage: 'Hourly average', discharge: 'Today' },
  '7d': { triage: 'Daily average', discharge: 'Past 7 days' },
  '30d': { triage: 'Weekly average', discharge: 'Past 30 days' },
  '90d': { triage: 'Monthly average', discharge: 'Past 90 days' },
};

export function AnalyticsCharts({ triageTime, bedUtilization, dischargeAdmission }: AnalyticsChartsProps) {
  const [period, setPeriod] = useState('7d');

  const filteredTriage = useMemo(() => scaleData(triageTime, period, ['value']), [triageTime, period]);
  const filteredBeds = useMemo(() => scaleData(bedUtilization, period, ['utilized']), [bedUtilization, period]);
  const filteredDischarge = useMemo(() => scaleData(dischargeAdmission, period, ['discharged', 'admitted']), [dischargeAdmission, period]);

  const labels = PERIOD_LABELS[period] || PERIOD_LABELS['7d'];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground">Performance metrics and trends</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {TIME_PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Triage Time Trend */}
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-1">Avg. Triage Time</p>
          <p className="text-xs text-muted-foreground mb-3">{labels.triage}</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTriage} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="triageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#triageGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bed Utilization */}
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-1">Bed Utilization</p>
          <p className="text-xs text-muted-foreground mb-3">By zone (%)</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredBeds} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="zone"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="utilized"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Discharge vs Admission */}
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-1">Discharge vs Admission</p>
          <p className="text-xs text-muted-foreground mb-3">{labels.discharge}</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredDischarge} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="discharged" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="admitted" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#10b981' }} />
              <span className="text-muted-foreground">Discharged</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: '#f59e0b' }} />
              <span className="text-muted-foreground">Admitted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
