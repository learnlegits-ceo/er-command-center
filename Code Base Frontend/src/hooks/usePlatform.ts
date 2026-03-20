import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function usePlatformDashboard() {
  return useQuery({
    queryKey: ['platform', 'dashboard'],
    queryFn: () => endpoints.platform.getDashboard(),
    select: (res) => res.data?.data,
  })
}

export function useHospitals(params?: { search?: string; plan?: string; status?: string }) {
  return useQuery({
    queryKey: ['platform', 'hospitals', params],
    queryFn: () => endpoints.platform.getHospitals(params),
    select: (res) => res.data?.data,
  })
}

export function useHospital(id: string) {
  return useQuery({
    queryKey: ['platform', 'hospitals', id],
    queryFn: () => endpoints.platform.getHospital(id),
    select: (res) => res.data?.data,
    enabled: !!id,
  })
}

export function useCreateHospital() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => endpoints.platform.createHospital(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'hospitals'] })
      qc.invalidateQueries({ queryKey: ['platform', 'dashboard'] })
    },
  })
}

export function useUpdateHospitalStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      endpoints.platform.updateHospitalStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'hospitals'] })
    },
  })
}

export function usePlans() {
  return useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => endpoints.platform.getPlans(),
    select: (res) => res.data?.data,
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => endpoints.platform.createPlan(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'plans'] })
    },
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      endpoints.platform.updatePlan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'plans'] })
    },
  })
}

export function usePlatformTeam() {
  return useQuery({
    queryKey: ['platform', 'team'],
    queryFn: () => endpoints.platform.getTeam(),
    select: (res) => res.data?.data,
  })
}

export function useInviteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { name: string; email: string; password: string }) =>
      endpoints.platform.inviteTeamMember(params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'team'] })
    },
  })
}

export function useRemoveTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => endpoints.platform.removeTeamMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'team'] })
    },
  })
}

export function usePlatformBillingOverview() {
  return useQuery({
    queryKey: ['platform', 'billing', 'overview'],
    queryFn: () => endpoints.platform.getBillingOverview(),
    select: (res) => res.data?.data,
  })
}

export function useGenerateInvoices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => endpoints.platform.generateInvoices(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform', 'billing'] })
    },
  })
}
