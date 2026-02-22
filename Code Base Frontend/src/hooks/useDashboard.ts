import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await endpoints.dashboard.getStats()
      return response.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useOccupancy() {
  return useQuery({
    queryKey: ['dashboard', 'occupancy'],
    queryFn: async () => {
      const response = await endpoints.dashboard.getOccupancy()
      return response.data
    },
    refetchInterval: 60000, // Refetch every minute
  })
}

export function usePatientFlow() {
  return useQuery({
    queryKey: ['dashboard', 'patient-flow'],
    queryFn: async () => {
      const response = await endpoints.dashboard.getPatientFlow()
      return response.data
    },
    refetchInterval: 60000,
  })
}
