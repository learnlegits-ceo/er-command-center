import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const response = await endpoints.alerts.getAll()
      return response.data
    },
    refetchInterval: 15000, // Refetch every 15 seconds for timely alerts
  })
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: async () => {
      const response = await endpoints.alerts.getActive()
      return response.data
    },
    refetchInterval: 15000, // Refetch every 15 seconds for timely alerts
  })
}

// Helper to optimistically update an alert's status in BOTH cached lists
// (full list + active list/badge). Returns previous data for rollback.
function optimisticStatusUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  alertId: string,
  newStatus: string,
  extraFields?: Record<string, string | null>
) {
  const previousFull = queryClient.getQueryData(['alerts'])
  const previousActive = queryClient.getQueryData(['alerts', 'active'])

  // Patch the full alerts list
  queryClient.setQueryData(['alerts'], (old: any) => {
    if (!old?.data?.alerts) return old
    return {
      ...old,
      data: {
        ...old.data,
        alerts: old.data.alerts.map((alert: any) =>
          alert.id === alertId
            ? { ...alert, status: newStatus, ...extraFields }
            : alert
        ),
      },
    }
  })

  // Patch the active alerts list (used by the header badge unreadCount)
  queryClient.setQueryData(['alerts', 'active'], (old: any) => {
    if (!old?.data) return old
    const wasUnread = old.data.alerts?.find((a: any) => a.id === alertId)?.status === 'unread'
    const willBeUnread = newStatus === 'unread'
    const delta = wasUnread && !willBeUnread ? -1 : (!wasUnread && willBeUnread ? 1 : 0)
    return {
      ...old,
      data: {
        ...old.data,
        unreadCount: Math.max(0, (old.data.unreadCount || 0) + delta),
        alerts: old.data.alerts?.map((a: any) =>
          a.id === alertId ? { ...a, status: newStatus, ...extraFields } : a
        ),
      },
    }
  })

  return { previousFull, previousActive }
}

function rollbackOptimisticUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  context: { previousFull?: unknown; previousActive?: unknown } | undefined,
) {
  if (!context) return
  if (context.previousFull !== undefined) queryClient.setQueryData(['alerts'], context.previousFull)
  if (context.previousActive !== undefined) queryClient.setQueryData(['alerts', 'active'], context.previousActive)
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await endpoints.alerts.markRead(id)
      return response.data
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] })
      const context = optimisticStatusUpdate(queryClient, id, 'read', {
        readAt: new Date().toISOString(),
      })
      return context
    },
    onError: (_err, _id, context) => {
      rollbackOptimisticUpdate(queryClient, context as any)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await endpoints.alerts.acknowledge(id)
      return response.data
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] })
      const context = optimisticStatusUpdate(queryClient, id, 'acknowledged', {
        acknowledgedAt: new Date().toISOString(),
      })
      return context
    },
    onError: (_err, _id, context) => {
      rollbackOptimisticUpdate(queryClient, context as any)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await endpoints.alerts.resolve(id)
      return response.data
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] })
      const context = optimisticStatusUpdate(queryClient, id, 'resolved', {
        resolvedAt: new Date().toISOString(),
      })
      return context
    },
    onError: (_err, _id, context) => {
      rollbackOptimisticUpdate(queryClient, context as any)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useDismissAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await endpoints.alerts.dismiss(id)
      return response.data
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['alerts'] })
      const previousFull = queryClient.getQueryData(['alerts'])
      const previousActive = queryClient.getQueryData(['alerts', 'active'])

      // Remove dismissed alert from both lists
      queryClient.setQueryData(['alerts'], (old: any) => {
        if (!old?.data?.alerts) return old
        return {
          ...old,
          data: {
            ...old.data,
            alerts: old.data.alerts.filter((alert: any) => alert.id !== id),
          },
        }
      })
      queryClient.setQueryData(['alerts', 'active'], (old: any) => {
        if (!old?.data?.alerts) return old
        const wasUnread = old.data.alerts.find((a: any) => a.id === id)?.status === 'unread'
        return {
          ...old,
          data: {
            ...old.data,
            unreadCount: wasUnread ? Math.max(0, (old.data.unreadCount || 0) - 1) : old.data.unreadCount,
            alerts: old.data.alerts.filter((a: any) => a.id !== id),
          },
        }
      })

      return { previousFull, previousActive }
    },
    onError: (_err, _id, context) => {
      rollbackOptimisticUpdate(queryClient, context as any)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
