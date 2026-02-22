import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'
import { Patient } from '@/data/types'

export function usePatients(params?: { status?: string; department?: string }) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: async () => {
      const response = await endpoints.patients.getAll(params)
      return response.data
    },
    staleTime: 0, // Always consider data stale so refetch triggers immediately
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: async () => {
      const response = await endpoints.patients.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Patient>) => {
      const response = await endpoints.patients.create(data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate patients list to refresh immediately
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      // Also invalidate dashboard stats to update patient counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdatePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const response = await endpoints.patients.update(id, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await endpoints.patients.delete(id)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
