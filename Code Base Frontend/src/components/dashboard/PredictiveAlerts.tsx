import { AlertCircle, AlertTriangle, Info, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: number;
  type: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
}

interface PredictiveAlertsProps {
  alerts: Alert[];
}

export function PredictiveAlerts({ alerts }: PredictiveAlertsProps) {
  const alertConfig = {
    critical: {
      icon: AlertCircle,
      bg: 'bg-urgency-critical/5',
      border: 'border-urgency-critical/20',
      iconColor: 'text-urgency-critical',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-urgency-moderate/5',
      border: 'border-urgency-moderate/20',
      iconColor: 'text-urgency-moderate',
    },
    info: {
      icon: Info,
      bg: 'bg-primary/5',
      border: 'border-primary/20',
      iconColor: 'text-primary',
    },
  };

  // Show latest 5 prominently, rest are scrollable
  const latestAlerts = alerts.slice(0, 5);
  const olderAlerts = alerts.slice(5);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">AI Predictions</h3>
        {alerts.length > 0 && (
          <span className="text-xs text-muted-foreground">({alerts.length})</span>
        )}
      </div>

      {alerts.length === 0 && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 text-center">
          <p className="text-sm text-muted-foreground">No AI predictions at this time</p>
        </div>
      )}

      {/* Latest 5 predictions */}
      <div className="space-y-2">
        {latestAlerts.map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={cn(
                'p-3 rounded-lg border transition-clinical',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-start gap-2">
                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Older predictions in scrollable area */}
      {olderAlerts.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1.5">Older predictions</p>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {olderAlerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;

              return (
                <div
                  key={alert.id}
                  className={cn(
                    'p-2.5 rounded-lg border transition-clinical opacity-80',
                    config.bg,
                    config.border
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', config.iconColor)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
