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

export function AnalyticsCharts({ triageTime, bedUtilization, dischargeAdmission }: AnalyticsChartsProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Analytics (24h)</h3>
      <p className="text-sm text-muted-foreground mb-5">Performance metrics and trends</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Triage Time Trend */}
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm font-medium text-foreground mb-1">Avg. Triage Time</p>
          <p className="text-xs text-muted-foreground mb-3">Minutes per patient</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={triageTime} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
              <BarChart data={bedUtilization} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
          <p className="text-xs text-muted-foreground mb-3">Weekly trend</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dischargeAdmission} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
