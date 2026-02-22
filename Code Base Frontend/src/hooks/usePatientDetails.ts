import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints } from '@/lib/api'

export interface VitalRecord {
  id: string
  hr: number | null
  bp: string | null
  spo2: number | null
  temp: number | null
  rr: number | null
  source: 'manual' | 'ocr'
  recordedAt: string
  recordedBy: {
    id: string
    name: string
    role: string
  } | null
}

export interface TriageTimelineEvent {
  id: string
  fromPriority: number | null
  toPriority: number
  priorityLabel: string
  priorityColor: string
  reasoning: string | null
  recommendations: string[] | null
  confidence: number | null
  estimatedWaitTime: string | null
  suggestedDepartment: string | null
  isApplied: boolean
  appliedAt: string | null
  appliedBy: {
    id: string
    name: string
    role: string
  } | null
  createdAt: string
  source: 'ai' | 'manual'
}

export interface TriageRecommendation {
  currentPriority: number
  currentLabel: string
  recommendedPriority: number
  recommendedLabel: string
  reasoning: string
  recommendations: string[]
  confidence: number
  estimatedWaitTime: string
  shouldShift: boolean
}

export function usePatientVitals(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-vitals', patientId],
    queryFn: async () => {
      if (!patientId) return []
      const response = await endpoints.patients.getVitals(patientId)
      return response.data.data.vitals as VitalRecord[]
    },
    enabled: !!patientId,
  })
}

export function usePatientTriageTimeline(patientId: string | null) {
  return useQuery({
    queryKey: ['patient-triage-timeline', patientId],
    queryFn: async () => {
      if (!patientId) return []
      const response = await endpoints.patients.getTriageTimeline(patientId)
      return response.data.data.timeline as TriageTimelineEvent[]
    },
    enabled: !!patientId,
  })
}

export function useAddVitals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, vitals }: { patientId: string; vitals: any }) => {
      const response = await endpoints.patients.addVitals(patientId, vitals)
      return response.data
    },
    onSuccess: async (data, variables) => {
      // Immediately seed triage timeline cache with data from mutation response
      // so the blue box updates without waiting for the refetch round-trip
      if (data?.data?.triage) {
        const freshTriage = data.data.triage;
        queryClient.setQueryData(
          ['patient-triage-timeline', variables.patientId],
          (old: TriageTimelineEvent[] | undefined) => {
            const newEntry: TriageTimelineEvent = {
              id: `temp-${Date.now()}`,
              fromPriority: old?.[0]?.toPriority ?? null,
              toPriority: freshTriage.priority,
              priorityLabel: freshTriage.priorityLabel || '',
              priorityColor: '',
              reasoning: freshTriage.reasoning,
              recommendations: freshTriage.recommendations || [],
              confidence: freshTriage.confidence ?? null,
              estimatedWaitTime: freshTriage.estimatedWaitTime ?? null,
              suggestedDepartment: null,
              isApplied: true,
              appliedAt: new Date().toISOString(),
              appliedBy: null,
              createdAt: new Date().toISOString(),
              source: 'ai',
            };
            return [newEntry, ...(old || [])];
          }
        );

        // Also update the patients list cache so the dashboard queue
        // shows the latest triage reasoning immediately
        queryClient.setQueriesData<any>(
          { queryKey: ['patients'] },
          (old: any) => {
            if (!old?.data?.patients) return old;
            return {
              ...old,
              data: {
                ...old.data,
                patients: old.data.patients.map((p: any) =>
                  p.id === variables.patientId
                    ? { ...p, triage: freshTriage }
                    : p
                )
              }
            };
          }
        );
      }

      // Invalidate (keep stale data visible) then refetch all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-vitals', variables.patientId] }),
        queryClient.invalidateQueries({ queryKey: ['patient-triage-timeline', variables.patientId] }),
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ])
    },
  })
}

export function useRecommendTriageShift() {
  return useMutation({
    mutationFn: async ({ patientId, context }: { patientId: string; context: any }) => {
      const response = await endpoints.patients.recommendTriageShift(patientId, context)
      return response.data.data as TriageRecommendation
    },
  })
}

export function useShiftTriage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: any }) => {
      const response = await endpoints.patients.shiftTriage(patientId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      // Optimistically update the patients list with the shift reasoning
      const shiftData = variables.data;
      if (shiftData?.reasoning) {
        queryClient.setQueriesData<any>(
          { queryKey: ['patients'] },
          (old: any) => {
            if (!old?.data?.patients) return old;
            return {
              ...old,
              data: {
                ...old.data,
                patients: old.data.patients.map((p: any) =>
                  p.id === variables.patientId
                    ? {
                        ...p,
                        priority: shiftData.priority,
                        priorityLabel: shiftData.priorityLabel || p.priorityLabel,
                        triage: {
                          ...p.triage,
                          reasoning: shiftData.reasoning,
                          recommendations: shiftData.recommendations || [],
                          confidence: shiftData.confidence ?? p.triage?.confidence,
                          estimatedWaitTime: shiftData.estimatedWaitTime ?? p.triage?.estimatedWaitTime,
                        }
                      }
                    : p
                )
              }
            };
          }
        );
      }
      queryClient.invalidateQueries({ queryKey: ['patient-triage-timeline', variables.patientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useCreatePrescription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: any }) => {
      const response = await endpoints.patients.createPrescription(patientId, data)
      return response.data
    },
    onSuccess: async (_, variables) => {
      // Prescription triggers re-triage on backend, so refresh all relevant data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-triage-timeline', variables.patientId] }),
        queryClient.invalidateQueries({ queryKey: ['patients'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ])
    },
  })
}

export function useDischargePatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: any }) => {
      const response = await endpoints.patients.discharge(patientId, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

export function useTransferToOPD() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId }: { patientId: string }) => {
      const response = await endpoints.patients.transferToOPD(patientId)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient-triage-timeline', variables.patientId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}

// ---- Patient Notes ----

export interface PatientNoteData {
  id: string
  type: string
  content: string
  createdAt: string | null
  createdBy: {
    id: string
    name: string
    role: string
  } | null
}

export function usePatientNotes(patientId: string | null, noteType?: string) {
  return useQuery({
    queryKey: ['patient-notes', patientId, noteType],
    queryFn: async () => {
      if (!patientId) return []
      const response = await endpoints.patients.getNotes(patientId, noteType)
      return response.data.data as PatientNoteData[]
    },
    enabled: !!patientId,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ patientId, data }: { patientId: string; data: { type: string; content: string; is_confidential?: boolean } }) => {
      const response = await endpoints.patients.createNote(patientId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-notes', variables.patientId] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })
}
