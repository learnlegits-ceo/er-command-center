import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { TriageQueue } from '@/components/dashboard/TriageQueue'
import { PatientDetailModal } from '@/components/dashboard/PatientDetailModal'
import { NewArrivalModal } from '@/components/dashboard/NewArrivalModal'
import { CapacityStats } from '@/components/dashboard/CapacityStats'
import { PredictiveAlerts } from '@/components/dashboard/PredictiveAlerts'
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts'
import { useDashboardStats, usePatientFlow } from '@/hooks/useDashboard'
import { usePatients } from '@/hooks/usePatients'
import { useActiveAlerts } from '@/hooks/useAlerts'
import { useBeds } from '@/hooks/useBeds'
import { useUser } from '@/contexts/UserContext'
import { getDefaultAvatar } from '@/lib/utils'

// Map unit parameter to department name
const unitToDepartment: Record<string, string> = {
  'unit-a': 'Emergency Department',
  'unit-b': 'Intensive Care Unit',
  'care-unit': 'Emergency Care Unit',
  'trauma': 'Trauma Center',
  'icu': 'Intensive Care Unit',
  'general-ward': 'General Ward',
  'opd': 'Outpatient Department',
}

export default function Dashboard() {
  const { unit = 'unit-a' } = useParams()
  const { user } = useUser()
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [newArrivalOpen, setNewArrivalOpen] = useState(false)
  const [myPatientsOnly, setMyPatientsOnly] = useState(false)

  // Get department name from unit parameter
  const departmentName = unitToDepartment[unit] || 'Emergency Department'

  // Fetch real data from backend APIs
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats()
  // Show all patients across all departments
  const { data: patients, isLoading: patientsLoading, error: patientsError } = usePatients({
    status: 'all'
  })
  const { data: alerts, isLoading: alertsLoading, error: alertsError } = useActiveAlerts()
  const { data: patientFlow } = usePatientFlow()
  const { data: bedsData } = useBeds()

  // Derive real ICU capacity from beds data
  const allBeds: any[] = bedsData?.data || []
  const icuBeds = allBeds.filter((b: any) => (b.bedType || b.type)?.toLowerCase() === 'icu')
  const icuTotal = icuBeds.length
  const icuOccupied = icuBeds.filter((b: any) => b.status === 'occupied').length

  // Transform backend data to component format
  const bedCapacity = stats?.data ? {
    total: stats.data.beds?.total || 0,
    occupied: stats.data.beds?.occupied || 0,
    available: stats.data.beds?.available || 0,
    icu: {
      total: icuTotal || stats.data.patients?.inICU || 0,
      occupied: icuOccupied || stats.data.patients?.inICU || 0,
      available: Math.max(0, (icuTotal || 0) - (icuOccupied || 0))
    }
  } : {
    total: 0,
    occupied: 0,
    available: 0,
    icu: { total: 0, occupied: 0, available: 0 }
  }

  // Transform alerts to component format - show only AI/system predictions, not action logs
  // AI predictions are triggered by: vitals_retriage (AI auto-triage from vitals),
  // vitals_monitor (critical vitals detection), seed_existing_data (AI triage analysis)
  // Exclude: triage_shift (manual action by staff), vitals_update (simple vitals log)
  const aiTriggers = ['vitals_retriage', 'vitals_monitor', 'seed_existing_data']
  const transformedAlerts = alerts?.data?.alerts
    ?.filter((alert: any) => alert.triggeredBy && aiTriggers.includes(alert.triggeredBy))
    ?.map((alert: any) => ({
      id: alert.id,
      type: alert.priority === 'critical' ? 'critical' : alert.priority === 'high' ? 'warning' : 'info',
      message: alert.message || alert.title,
      time: formatTimeAgo(alert.createdAt)
    })) || []

  // Use patient flow data for analytics charts
  const analyticsData = {
    triageTime: patientFlow?.data?.triage_time || [],
    bedUtilization: patientFlow?.data?.bed_utilization || [],
    dischargeAdmission: patientFlow?.data?.discharge_admission || []
  }

  // Helper function to format time ago
  function formatTimeAgo(dateString: string): string {
    if (!dateString) return ''
    // Handle PostgreSQL timestamp format (space instead of T)
    let normalizedDate = dateString
    if (dateString.includes(' ') && !dateString.includes('T')) {
      normalizedDate = dateString.replace(' ', 'T')
    }
    const date = new Date(normalizedDate)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `~${diffMins} min ago`
    } else if (diffHours < 24) {
      return `~${diffHours} hrs ago`
    } else {
      return `~${Math.floor(diffHours / 24)} days ago`
    }
  }

  // Calculate hours since registration
  function calculateArrivalHours(admittedAt: string): string {
    if (!admittedAt) return '0 hrs'
    const date = new Date(admittedAt)
    const now = new Date()
    const totalHours = (now.getTime() - date.getTime()) / 3600000

    if (totalHours < 1) {
      return '< 1 hr'
    } else {
      return `${Math.floor(totalHours)} hrs`
    }
  }

  // Transform backend patient data to TriageQueue format
  function transformPatientData(backendPatients: any[]): any[] {
    return backendPatients.map((patient: any) => {
      // Handle L1-L4 triage levels, default to 0 (pending) if not set
      const triageLevel = patient.priority && patient.priority >= 1 && patient.priority <= 4
        ? patient.priority
        : 0

      // Use backend priorityLabel if available, otherwise generate from level
      const triageLabelMap: Record<number, string> = {
        0: 'Pending Triage',
        1: 'L1 - Critical',
        2: 'L2 - Emergent',
        3: 'L3 - Urgent',
        4: 'L4 - Non-Urgent'
      }
      const triageLabel = patient.priorityLabel || triageLabelMap[triageLevel] || 'Pending Triage'

      return {
        id: patient.id,
        name: patient.name,
        age: `${patient.age}${patient.gender?.charAt(0)?.toUpperCase() || ''}`,
        gender: patient.gender,
        avatar: patient.photo || undefined,
        assignedDoctor: patient.assignedDoctor || 'Unassigned',
        uhi: patient.patientId || '',
        euhi: patient.patientId || '', // Using same ID if EUHI not available
        complaint: patient.complaint || 'No complaint specified',
        vitals: {
          hr: patient.vitals?.hr || 0,
          bp: patient.vitals?.bp || '0/0',
          spo2: patient.vitals?.spo2 || 0,
          temp: patient.vitals?.temp || 0,
          rr: patient.vitals?.rr || 0
        },
        vitalsSource: patient.vitals?.source || 'manual',
        triageLevel,
        triageLabel,
        triageReasoning: patient.triage?.reasoning || null,
        triageRecommendations: patient.triage?.recommendations || [],
        triageConfidence: patient.triage?.confidence || null,
        estimatedWaitTime: patient.triage?.estimatedWaitTime || null,
        updatedBy: {
          name: patient.lastUpdatedBy?.name || patient.assignedNurse || patient.assignedDoctor || 'System',
          role: patient.lastUpdatedBy?.role || 'staff',
          avatar: patient.lastUpdatedBy?.avatar || getDefaultAvatar(patient.lastUpdatedBy?.name || patient.assignedNurse || 'System', patient.lastUpdatedBy?.role || 'nurse'),
          time: formatTimeAgo(patient.lastUpdatedBy?.time || patient.vitals?.recordedAt || patient.admittedAt)
        },
        waitTime: calculateArrivalHours(patient.admittedAt),
        bed: patient.bed,
        bedId: patient.bedId,
        phone: patient.phone || '',
        bloodGroup: patient.bloodGroup || '',
        arrivedAt: patient.admittedAt ? new Date(patient.admittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
        status: patient.status,
        needsTriage: triageLevel === 0 // Flag for patients needing triage
      }
    })
  }

  // Transform patients data — exclude discharged and transferred patients from ER queue
  const transformedPatients = patients?.data?.patients
    ? transformPatientData(
        patients.data.patients.filter((p: any) => p.status !== 'discharged' && p.status !== 'transferred_to_opd')
      )
    : []

  // Apply My Patients filter — matches on assignedDoctor (doctors) or updatedBy.name (nurses)
  const displayedPatients = myPatientsOnly && user?.name
    ? transformedPatients.filter((p: any) => {
        const userName = user.name.toLowerCase()
        return (
          p.assignedDoctor?.toLowerCase().includes(userName) ||
          p.updatedBy?.name?.toLowerCase().includes(userName)
        )
      })
    : transformedPatients

  // Derive selectedPatient from fresh transformed data so vitals stay in sync.
  // Keep a stable snapshot: if the patient disappears from the list (e.g. after discharge),
  // the snapshot keeps the modal alive so the discharge summary can render.
  const patientSnapshotRef = useRef<any>(null)
  const livePatient = selectedPatientId
    ? transformedPatients.find((p: any) => p.id === selectedPatientId) ?? null
    : null
  // Update snapshot when we have live data for the selected patient
  if (livePatient) {
    patientSnapshotRef.current = livePatient
  }
  // Use live data when available, fall back to snapshot (after discharge)
  const selectedPatient = selectedPatientId ? (livePatient || patientSnapshotRef.current) : null

  // Handle loading state
  if (statsLoading || patientsLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  // Handle error state
  if (statsError || patientsError || alertsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-foreground font-semibold mb-2">Error loading dashboard data</p>
          <p className="text-muted-foreground text-sm">
            {(statsError as any)?.message || (patientsError as any)?.message || (alertsError as any)?.message || 'Please try again later'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* My Patients toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setMyPatientsOnly((v) => !v)}
          className={`text-sm px-4 py-1.5 rounded-full border font-medium transition-colors ${
            myPatientsOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground'
          }`}
        >
          {myPatientsOnly ? 'My Patients' : 'All Patients'}
        </button>
      </div>

      {/* AI Triage Queue */}
      <TriageQueue
        patients={displayedPatients}
        onNewArrival={() => setNewArrivalOpen(true)}
        onPatientClick={(patient) => setSelectedPatientId(patient.id)}
      />

      {/* Bed Capacity and Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CapacityStats capacity={bedCapacity} />
        <PredictiveAlerts alerts={transformedAlerts} />
      </div>

      {/* Analytics */}
      <AnalyticsCharts
        triageTime={analyticsData.triageTime}
        bedUtilization={analyticsData.bedUtilization}
        dischargeAdmission={analyticsData.dischargeAdmission}
      />

      {/* Patient Detail Modal */}
      <PatientDetailModal
        patient={selectedPatient}
        open={!!selectedPatient}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPatientId(null)
            patientSnapshotRef.current = null
          }
        }}
      />

      {/* New Arrival Modal */}
      <NewArrivalModal
        open={newArrivalOpen}
        onOpenChange={setNewArrivalOpen}
        defaultDepartmentName={departmentName}
      />
    </div>
  )
}
