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

// Helper to optimistically update an alert's status in the cached alerts list
function optimisticStatusUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  alertId: string,
  newStatus: string,
  extraFields?: Record<string, string | null>
) {
  // Snapshot the previous value
  const previousData = queryClient.getQueryData(['alerts'])

  // Optimistically update the cache
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

  return previousData
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
      const previousData = optimisticStatusUpdate(queryClient, id, 'read', {
        readAt: new Date().toISOString(),
      })
      return { previousData }
    },
    onError: (_err, _id, context) => {
      // Roll back on error
      if (context?.previousData) {
        queryClient.setQueryData(['alerts'], context.previousData)
      }
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
      const previousData = optimisticStatusUpdate(queryClient, id, 'acknowledged', {
        acknowledgedAt: new Date().toISOString(),
      })
      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['alerts'], context.previousData)
      }
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
      const previousData = optimisticStatusUpdate(queryClient, id, 'resolved', {
        resolvedAt: new Date().toISOString(),
      })
      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['alerts'], context.previousData)
      }
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
      const previousData = queryClient.getQueryData(['alerts'])

      // Remove dismissed alert from the list
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

      return { previousData }
    },
    onError: (_err, _id, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['alerts'], context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
