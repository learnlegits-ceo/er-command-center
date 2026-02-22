import { Alert } from '@/data/types'
import { cn } from '@/lib/utils'
import { AlertTriangle, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AlertBannerProps {
  alert: Alert
  onDismiss?: (id: string) => void
}

export function AlertBanner({ alert, onDismiss }: AlertBannerProps) {
  const getAlertIcon = () => {
    switch (alert.type) {
      case 'emergency':
        return <AlertTriangle className="h-5 w-5" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />
      case 'info':
        return <Info className="h-5 w-5" />
    }
  }

  const getAlertColor = () => {
    switch (alert.type) {
      case 'emergency':
        return 'bg-red-100 border-red-500 text-red-900'
      case 'warning':
        return 'bg-orange-100 border-orange-500 text-orange-900'
      case 'info':
        return 'bg-blue-100 border-blue-500 text-blue-900'
    }
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4',
        getAlertColor(),
        alert.priority === 'high' && 'alert-pulse'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{getAlertIcon()}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{alert.title}</h4>
        <p className="text-sm mt-1">{alert.message}</p>
        <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
          <span>Priority: {alert.priority.toUpperCase()}</span>
          <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
          {alert.status === 'acknowledged' && <span>✓ Acknowledged</span>}
        </div>
      </div>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-6 w-6"
          onClick={() => onDismiss(alert.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
