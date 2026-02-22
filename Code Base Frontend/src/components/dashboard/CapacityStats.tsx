import { Bed, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapacityStatsProps {
  capacity: {
    total: number;
    occupied: number;
    available: number;
    icu: {
      total: number;
      occupied: number;
      available: number;
    };
  };
}

export function CapacityStats({ capacity }: CapacityStatsProps) {
  const erUtilization = Math.round((capacity.occupied / capacity.total) * 100);
  const icuUtilization = Math.round((capacity.icu.occupied / capacity.icu.total) * 100);

  const stats = [
    {
      label: 'ER Beds',
      value: capacity.available,
      subtitle: `of ${capacity.total} available`,
      icon: Bed,
      color: capacity.available > 3 ? 'text-urgency-mild' : 'text-urgency-moderate',
    },
    {
      label: 'ICU/Critical',
      value: capacity.icu.available,
      subtitle: `of ${capacity.icu.total} available`,
      icon: Activity,
      color: capacity.icu.available > 1 ? 'text-urgency-moderate' : 'text-urgency-critical',
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Bed Capacity</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-3 shadow-clinical-card"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn('stat-number', stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 shadow-clinical-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">ER Utilization</span>
          </div>
          <div className="flex items-end gap-2">
            <p className={cn('stat-number', erUtilization > 80 ? 'text-urgency-moderate' : 'text-foreground')}>
              {erUtilization}%
            </p>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                erUtilization > 80 ? 'bg-urgency-moderate' : 'bg-primary'
              )}
              style={{ width: `${erUtilization}%` }}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-3 shadow-clinical-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">ICU Utilization</span>
          </div>
          <div className="flex items-end gap-2">
            <p className={cn('stat-number', icuUtilization > 85 ? 'text-urgency-critical' : 'text-foreground')}>
              {icuUtilization}%
            </p>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                icuUtilization > 85 ? 'bg-urgency-critical' : 'bg-primary'
              )}
              style={{ width: `${icuUtilization}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
