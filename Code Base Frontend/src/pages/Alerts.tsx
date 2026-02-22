import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  User,
  Stethoscope,
  Syringe,
  Shield,
  Activity,
  FileText,
  Pill,
  Bed,
  Users,
  Package,
  Settings,
  X,
  Filter,
  Home,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/UserContext'
import { useAlerts, useMarkAlertRead, useAcknowledgeAlert, useResolveAlert, useDismissAlert } from '@/hooks/useAlerts'
import { endpoints } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Alert } from '@/data/types'

type AlertPriority = 'critical' | 'high' | 'medium' | 'low'
type AlertStatus = 'unread' | 'read' | 'acknowledged' | 'resolved' | 'dismissed'

const priorityConfig = {
  critical: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200', icon: AlertTriangle },
  high: { color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', icon: AlertCircle },
  medium: { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', icon: Clock },
  low: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', icon: Info }
}

const categoryIcons: Record<string, typeof Activity> = {
  'Vitals': Activity,
  'Lab Results': FileText,
  'Consultation': Stethoscope,
  'Medication': Pill,
  'Discharge': CheckCircle,
  'Bed Management': Bed,
  'Staffing': Users,
  'Inventory': Package,
  'System': Settings,
  'Staff': User,
  'Equipment': Settings
}

function getTimeAgo(isoDate: string): string {
  if (!isoDate) return ''
  // Handle PostgreSQL timestamp format (space instead of T)
  let normalized = isoDate
  if (isoDate.includes(' ') && !isoDate.includes('T')) {
    normalized = isoDate.replace(' ', 'T')
  }
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

export default function Alerts() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { data: alerts, isLoading, error } = useAlerts()
  const markReadMutation = useMarkAlertRead()
  const acknowledgeMutation = useAcknowledgeAlert()
  const resolveMutation = useResolveAlert()
  const dismissMutation = useDismissAlert()

  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | AlertPriority>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const seededRef = useRef(false)

  // Auto-seed alerts from existing patient data when alerts are empty
  useEffect(() => {
    const alertsList = alerts?.data?.alerts || []
    if (!isLoading && !error && alertsList.length === 0 && !seededRef.current) {
      seededRef.current = true
      endpoints.alerts.seed().then(() => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      }).catch(() => {
        // Seed failed silently - alerts will just remain empty
      })
    }
  }, [alerts, isLoading, error, queryClient])

  // Clear error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  const handleMutationError = (action: string, previousFilter: typeof statusFilter) => {
    return (err: any) => {
      setStatusFilter(previousFilter)
      const rawDetail = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Unknown error'
      const detail = typeof rawDetail === 'string'
        ? rawDetail
        : Array.isArray(rawDetail)
          ? rawDetail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
          : JSON.stringify(rawDetail)
      setErrorMessage(`Failed to ${action} alert: ${detail}`)
      console.error(`Failed to ${action} alert:`, err?.response?.data || err)
    }
  }

  const handleMarkAsRead = (alertId: string) => {
    const previousFilter = statusFilter
    setStatusFilter('read')
    markReadMutation.mutate(alertId, {
      onError: handleMutationError('mark as read', previousFilter)
    })
  }

  const handleAcknowledge = (alertId: string) => {
    const previousFilter = statusFilter
    setStatusFilter('acknowledged')
    acknowledgeMutation.mutate(alertId, {
      onError: handleMutationError('acknowledge', previousFilter)
    })
  }

  const handleResolve = (alertId: string) => {
    const previousFilter = statusFilter
    setStatusFilter('resolved')
    resolveMutation.mutate(alertId, {
      onError: handleMutationError('resolve', previousFilter)
    })
  }

  const handleDismiss = (alertId: string) => {
    dismissMutation.mutate(alertId, {
      onError: handleMutationError('dismiss', statusFilter)
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading alerts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-medium">Failed to load alerts</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    )
  }

  // API returns {success: true, data: {alerts: [...], pagination: {...}}}
  const alertsList = alerts?.data?.alerts || []

  // Apply priority and status filters
  const filteredAlerts = alertsList.filter((alert: Alert) => {
    const priorityMatch = filter === 'all' || alert.priority === filter
    const statusMatch = statusFilter === 'all' || alert.status === statusFilter
    return priorityMatch && statusMatch
  })

  const unreadCount = alertsList.filter((a: Alert) => a.status === 'unread').length
  const criticalCount = alertsList.filter((a: Alert) => a.priority === 'critical' && a.status !== 'resolved').length

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'doctor': return <Stethoscope className="w-5 h-5" />
      case 'nurse': return <Syringe className="w-5 h-5" />
      case 'admin': return <Shield className="w-5 h-5" />
      default: return <Bell className="w-5 h-5" />
    }
  }

  const getRoleAlertDescription = () => {
    switch (user?.role) {
      case 'doctor': return 'Patient conditions, lab results, and consultation requests'
      case 'nurse': return 'Medication schedules, vitals checks, and patient care tasks'
      case 'admin': return 'Staff management, inventory, and system notifications'
      default: return 'All system notifications'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getRoleIcon()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Alerts & Notifications</h1>
              <p className="text-sm text-muted-foreground">{getRoleAlertDescription()}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {criticalCount} Critical
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Bell className="w-4 h-4" />
            {unreadCount} Unread
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="gap-2">
            <Home className="w-4 h-4" />
            Home
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Priority:</span>
          <div className="flex gap-1">
            {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p as typeof filter)}
                className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${
                  filter === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <div className="flex gap-1">
            {['all', 'unread', 'read', 'acknowledged', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as typeof statusFilter)}
                className={`px-3 py-1 text-xs rounded-full capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No alerts matching your filters</p>
          </div>
        ) : (
          filteredAlerts.map((alert: Alert) => {
            const config = priorityConfig[alert.priority]
            const PriorityIcon = config.icon
            const CategoryIcon = categoryIcons[alert.category] || Bell

            return (
              <div
                key={alert.id}
                className={`bg-card border rounded-lg p-4 transition-all ${
                  alert.status === 'unread' ? `${config.borderColor} border-l-4` : 'border-border'
                } ${alert.status === 'resolved' ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority indicator */}
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <PriorityIcon className={`w-5 h-5 ${config.textColor}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium text-foreground ${alert.status === 'unread' ? 'font-semibold' : ''}`}>
                            {alert.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                            {alert.priority}
                          </span>
                          {alert.status !== 'unread' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground capitalize">
                              {alert.status}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CategoryIcon className="w-3 h-3" />
                            {alert.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(alert.createdAt)}
                          </span>
                          {alert.patient && (
                            <>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {alert.patient.name}
                              </span>
                              {alert.patient.department && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                  <Stethoscope className="w-3 h-3" />
                                  {alert.patient.department}
                                </span>
                              )}
                              {alert.patient.uhi && (
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-mono">
                                  UHI: {alert.patient.uhi}
                                </span>
                              )}
                              {alert.patient.euhi && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono">
                                  EUHI: {alert.patient.euhi}
                                </span>
                              )}
                              {alert.patient.bed && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-muted rounded">
                                  <Bed className="w-3 h-3" />
                                  {alert.patient.bed}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions: unread → Mark Read → read → Acknowledge → acknowledged → Resolve → resolved */}
                      <div className="flex items-center gap-2">
                        {alert.status === 'unread' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(alert.id)}
                            disabled={markReadMutation.isPending}
                          >
                            Mark Read
                          </Button>
                        )}
                        {(alert.status === 'unread' || alert.status === 'read') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeMutation.isPending}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolveMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                        {alert.status !== 'resolved' && alert.status !== 'dismissed' && (
                          <button
                            onClick={() => handleDismiss(alert.id)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                            title="Dismiss"
                            disabled={dismissMutation.isPending}
                          >
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
