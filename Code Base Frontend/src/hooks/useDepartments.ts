import { useQuery } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export interface Department {
  id: string
  name: string
  code: string
  floor?: string
  capacity?: number
}

export interface Doctor {
  id: string
  name: string
  specialization?: string
}

export interface Bed {
  id: string
  bedNumber: string
  bedType?: string
  floor?: string
  wing?: string
  status: string
  features?: string[]
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await endpoints.departments.getAll()
      return response.data.data.departments as Department[]
    },
  })
}

export function useDepartmentDoctors(departmentId: string | null) {
  return useQuery({
    queryKey: ['department-doctors', departmentId],
    queryFn: async () => {
      if (!departmentId) return []
      const response = await endpoints.departments.getDoctors(departmentId)
      return response.data.data.doctors as Doctor[]
    },
    enabled: !!departmentId,
  })
}

export function useDepartmentBeds(departmentId: string | null, status?: string) {
  return useQuery({
    queryKey: ['department-beds', departmentId, status],
    queryFn: async () => {
      if (!departmentId) return []
      const response = await endpoints.departments.getBeds(departmentId, status)
      return response.data.data.beds as Bed[]
    },
    enabled: !!departmentId,
  })
}
