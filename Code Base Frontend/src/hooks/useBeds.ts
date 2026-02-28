import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function useBeds(params?: { department?: string }) {
  return useQuery({
    queryKey: ['beds', params],
    queryFn: async () => {
      const response = await endpoints.beds.getAll(params)
      return response.data
    },
    refetchInterval: 10000, // Refetch every 10 seconds for cross-device sync
    refetchOnWindowFocus: true,
  })
}

export function useBed(id: string) {
  return useQuery({
    queryKey: ['beds', id],
    queryFn: async () => {
      const response = await endpoints.beds.getById(id)
      return response.data
    },
    enabled: !!id,
  })
}

export function useUpdateBedStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await endpoints.beds.updateStatus(id, status)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
    },
  })
}

export function useAssignBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ bedId, patientId }: { bedId: string; patientId: string }) => {
      const response = await endpoints.beds.assign(bedId, patientId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}

export function useReleaseBed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bedId: string) => {
      const response = await endpoints.beds.release(bedId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
    },
  })
}
