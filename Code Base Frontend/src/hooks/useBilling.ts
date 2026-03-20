import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export function useCurrentBilling() {
  return useQuery({
    queryKey: ['billing', 'current'],
    queryFn: () => endpoints.billing.getCurrent(),
    select: (res) => res.data?.data,
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => endpoints.billing.getInvoices(),
    select: (res) => res.data?.data,
  })
}

export function useBedPricing() {
  return useQuery({
    queryKey: ['admin', 'bed-pricing'],
    queryFn: () => endpoints.admin.getBedPricing(),
    select: (res) => res.data?.data,
  })
}

export function useSetBedPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { bed_type: string; cost_per_day: number; currency?: string }) =>
      endpoints.admin.setBedPricing(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bed-pricing'] })
    },
  })
}

export function useUpdateBedPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { cost_per_day?: number; is_active?: boolean } }) =>
      endpoints.admin.updateBedPricing(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'bed-pricing'] })
    },
  })
}

export function useUsageStats() {
  return useQuery({
    queryKey: ['admin', 'usage'],
    queryFn: () => endpoints.admin.getUsage(),
    select: (res) => res.data?.data,
  })
}

export function useUsageHistory() {
  return useQuery({
    queryKey: ['admin', 'usage', 'history'],
    queryFn: () => endpoints.admin.getUsageHistory(),
    select: (res) => res.data?.data,
  })
}
