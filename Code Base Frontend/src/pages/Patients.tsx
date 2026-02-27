import { useState, useRef } from 'react'
import { PatientCard } from '@/components/PatientCard'
import { Button } from '@/components/ui/button'
import { usePatients } from '@/hooks/usePatients'
import { Plus, Search, Loader2, AlertCircle } from 'lucide-react'
import { Patient } from '@/data/types'
import { NewArrivalModal } from '@/components/dashboard/NewArrivalModal'
import { PatientDetailModal } from '@/components/dashboard/PatientDetailModal'

function transformPatientForModal(patient: any) {
  const triageLevel = patient.priority && patient.priority >= 1 && patient.priority <= 4
    ? patient.priority : 0
  const triageLabelMap: Record<number, string> = {
    0: 'Pending Triage', 1: 'L1 - Critical', 2: 'L2 - Emergent',
    3: 'L3 - Urgent', 4: 'L4 - Non-Urgent'
  }
  return {
    id: patient.id,
    name: patient.name,
    age: `${patient.age}${patient.gender?.charAt(0)?.toUpperCase() || ''}`,
    gender: patient.gender,
    avatar: patient.photo || undefined,
    assignedDoctor: patient.assignedDoctor || 'Unassigned',
    uhi: patient.patientId || '',
    euhi: patient.patientId || '',
    complaint: patient.complaint || 'No complaint specified',
    triageLevel,
    triageLabel: patient.priorityLabel || triageLabelMap[triageLevel] || 'Pending Triage',
    triageReasoning: patient.triage?.reasoning || null,
    triageRecommendations: patient.triage?.recommendations || [],
    triageConfidence: patient.triage?.confidence || null,
    estimatedWaitTime: patient.triage?.estimatedWaitTime || null,
    bed: patient.bed,
    bedId: patient.bedId,
    phone: patient.phone || '',
    bloodGroup: patient.bloodGroup || '',
    arrivedAt: patient.admittedAt
      ? new Date(patient.admittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '',
    status: patient.status,
  }
}

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all')
  const [newArrivalOpen, setNewArrivalOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const patientSnapshotRef = useRef<any>(null)

  // Fetch patients from backend API
  // API returns {success: true, data: {patients: [...], pagination: {...}}}
  // Pass status='all' to fetch all patients including pending_triage
  const { data: patientsResponse, isLoading, error } = usePatients({ status: 'all' })
  const rawPatients: any[] = patientsResponse?.data?.patients || []
  const patients = rawPatients as Patient[]

  // Derive selected patient with snapshot fallback (keeps modal alive after discharge)
  const liveSelectedRaw = selectedPatientId
    ? rawPatients.find((p: any) => p.id === selectedPatientId) ?? null
    : null
  const liveSelectedPatient = liveSelectedRaw ? transformPatientForModal(liveSelectedRaw) : null
  if (liveSelectedPatient) patientSnapshotRef.current = liveSelectedPatient
  const modalPatient = liveSelectedPatient || patientSnapshotRef.current

  const filteredPatients = patients.filter((patient: Patient) => {
    // Search by name or patient ID
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.patientId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.medicalRecordNumber?.toLowerCase().includes(searchTerm.toLowerCase())

    // Filter by status
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus

    // Filter by priority
    const matchesPriority = filterPriority === 'all' || patient.priority === filterPriority

    return matchesSearch && matchesStatus && matchesPriority
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patients</h1>
          <p className="text-muted-foreground">Manage and monitor all patients in the ER</p>
        </div>
        <Button onClick={() => setNewArrivalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or Patient ID..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'admitted' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('admitted')}
            size="sm"
          >
            Admitted
          </Button>
          <Button
            variant={filterStatus === 'pending_triage' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('pending_triage')}
            size="sm"
          >
            Pending
          </Button>
        </div>
      </div>

      {/* Priority Filter */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground self-center">Priority:</span>
        <Button
          variant={filterPriority === 'all' ? 'default' : 'outline'}
          onClick={() => setFilterPriority('all')}
          size="sm"
        >
          All
        </Button>
        <Button
          variant={filterPriority === 1 ? 'default' : 'outline'}
          onClick={() => setFilterPriority(1)}
          size="sm"
        >
          Critical
        </Button>
        <Button
          variant={filterPriority === 2 ? 'default' : 'outline'}
          onClick={() => setFilterPriority(2)}
          size="sm"
        >
          Urgent
        </Button>
        <Button
          variant={filterPriority === 3 ? 'default' : 'outline'}
          onClick={() => setFilterPriority(3)}
          size="sm"
        >
          Moderate
        </Button>
        <Button
          variant={filterPriority === 4 ? 'default' : 'outline'}
          onClick={() => setFilterPriority(4)}
          size="sm"
        >
          Low
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading patients...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load patients</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Patients Grid */}
      {!isLoading && !error && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient: Patient) => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onClick={() => setSelectedPatientId(patient.id)}
              />
            ))}
          </div>

          {filteredPatients.length === 0 && patients.length > 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No patients found matching your criteria</p>
            </div>
          )}

          {filteredPatients.length === 0 && patients.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No patients registered yet</p>
            </div>
          )}
        </>
      )}
      {/* New Arrival Modal */}
      <NewArrivalModal
        open={newArrivalOpen}
        onOpenChange={setNewArrivalOpen}
        defaultDepartmentName="Emergency Department"
      />

      {/* Patient Detail Modal */}
      <PatientDetailModal
        patient={modalPatient}
        open={!!modalPatient}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPatientId(null)
            patientSnapshotRef.current = null
          }
        }}
      />
    </div>
  )
}
