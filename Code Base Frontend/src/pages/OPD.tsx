import { useState, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Search, Plus, Phone, MoreVertical, Bed, Clock, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OPDPatientModal } from '@/components/dashboard/OPDPatientModal'
import { NewRegistrationModal } from '@/components/dashboard/NewRegistrationModal'
import { useUser } from '@/contexts/UserContext'
import { usePatients } from '@/hooks/usePatients'
import { useBeds } from '@/hooks/useBeds'
import { Patient } from '@/data/types'

interface BedGridItem {
  number: number
  status: 'occupied' | 'available' | 'maintenance'
  bedNumber?: string
}

// Map URL specialty param to backend department name
const specialtyToDepartment: Record<string, string> = {
  'general': 'Outpatient Department',
  'cardiology': 'Cardiology',
}

export default function OPD() {
  const { specialty = 'general' } = useParams()
  const { canRegisterPatients } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [registrationOpen, setRegistrationOpen] = useState(false)

  const departmentName = specialtyToDepartment[specialty] || 'Outpatient Department'

  // Fetch data filtered by department
  const { data: patientsResponse, isLoading: patientsLoading, error: patientsError } = usePatients({
    status: 'all',
    department: departmentName
  })
  const { data: bedsResponse, isLoading: bedsLoading, error: bedsError } = useBeds({
    department: departmentName
  })

  // Get patients — already filtered by department from the API
  const allPatients = patientsResponse?.data?.patients || []
  const patients = allPatients.filter((p: any) => p.status !== 'discharged')
  const beds = bedsResponse?.data || []

  // Calculate bed stats
  const totalBeds = beds.length || 12
  const occupiedBeds = beds.filter((b: any) => b.status === 'occupied').length
  const availableBeds = totalBeds - occupiedBeds

  // Filter patients based on search
  const filteredPatients = patients.filter((patient: any) => {
    if (!searchQuery) return true
    const search = searchQuery.toLowerCase()
    return (
      patient.name?.toLowerCase().includes(search) ||
      patient.patientId?.toLowerCase().includes(search) ||
      patient.phone?.toLowerCase().includes(search)
    )
  })

  // Derive selectedPatient from latest query data so it updates after edits.
  // Keep a stable snapshot so that if the patient disappears from the list (after discharge),
  // the modal and discharge summary can still render.
  const opdPatientSnapshotRef = useRef<any>(null)
  const liveSelectedPatient = useMemo(() => {
    if (!selectedPatientId) return null
    const allPats = patientsResponse?.data?.patients || []
    const raw = allPats.find((p: any) => p.id === selectedPatientId)
    if (!raw) return null
    return {
      id: raw.id,
      initials: raw.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??',
      name: raw.name,
      age: String(raw.age || ''),
      gender: raw.gender || '',
      purpose: raw.complaint || '',
      statusColor:
        raw.status === 'transferred_to_opd' ? 'bg-purple-100 text-purple-700' :
        raw.status === 'active' ? 'bg-green-100 text-green-700' :
        raw.status === 'admitted' ? 'bg-blue-100 text-blue-700' :
        raw.status === 'pending_triage' ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700',
      status: raw.status,
      uhi: raw.patientId || '',
      euhi: raw.status === 'transferred_to_opd' ? raw.patientId : undefined,
      tags: raw.status === 'transferred_to_opd' ? ['ER Referral'] : [],
      doctor: raw.assignedDoctor || 'Unassigned',
      bed: raw.bed || 'No bed',
      bedId: raw.bedId || '',
      bloodGroup: raw.bloodGroup || '',
      phone: raw.phone || '',
      photo: raw.photo || null,
      priority: raw.priority || null,
      priorityLabel: raw.priorityLabel || null,
      triage: raw.triage || null,
      vitals: raw.vitals || null,
      admittedAt: raw.admittedAt || null,
    }
  }, [selectedPatientId, patientsResponse])
  // Update snapshot when we have live data
  if (liveSelectedPatient) {
    opdPatientSnapshotRef.current = liveSelectedPatient
  }
  const selectedPatient = selectedPatientId ? (liveSelectedPatient || opdPatientSnapshotRef.current) : null

  const handlePatientClick = (patient: any) => {
    setSelectedPatientId(patient.id)
    setModalOpen(true)
  }

  // Generate bed grid from API data
  const bedGrid: BedGridItem[] = beds.length > 0
    ? beds.map((bed: any, i: number) => ({
        number: i + 1,
        status: bed.status as 'occupied' | 'available' | 'maintenance',
        bedNumber: bed.bedNumber
      }))
    : Array.from({ length: 12 }, (_, i) => ({
        number: i + 1,
        status: i < 4 ? 'occupied' : 'available' as 'occupied' | 'available'
      }))

  // Loading state
  if (patientsLoading || bedsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading OPD data...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (patientsError || bedsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-medium">Failed to load OPD data</p>
          <p className="text-sm text-muted-foreground">
            {(patientsError as any)?.message || (bedsError as any)?.message || 'Please try again'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* OP Registration & Queue */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">OP Registration & Queue</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {departmentName} · {filteredPatients.length} registered · {availableBeds} beds available
              </p>
            </div>
            {canRegisterPatients && (
              <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setRegistrationOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Registration
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 pt-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search by name, UHI, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            />
          </div>
        </div>

        {/* Patient Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-y">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  UHI / EUHI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Purpose / Doctor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Bed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No patients found
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient: Patient) => (
                  <tr key={patient.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handlePatientClick(patient)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground overflow-hidden">
                          {patient.photo ? (
                            <img src={patient.photo} alt={patient.name} className="h-full w-full object-cover" />
                          ) : (
                            patient.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{patient.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {patient.age}{patient.gender?.charAt(0)?.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="mr-2 h-4 w-4" />
                        {patient.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1">
                          <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">UHI:</span>
                          <span className="text-xs text-foreground font-mono">{patient.patientId}</span>
                        </div>
                        {patient.status === 'transferred_to_opd' && (
                          <div className="inline-flex items-center gap-1">
                            <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">EUHI:</span>
                            <span className="text-xs text-foreground font-mono">{patient.patientId}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {patient.complaint || 'No complaint'}
                          {patient.priority === 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                              Critical
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {typeof patient.assignedDoctor === 'string' ? patient.assignedDoctor : patient.assignedDoctor?.name || 'Unassigned'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Bed className="mr-2 h-4 w-4" />
                        {typeof patient.bed === 'string' ? patient.bed : patient.bed?.bedNumber || 'No bed'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'transferred_to_opd' ? 'bg-purple-100 text-purple-700' :
                        patient.status === 'active' ? 'bg-green-100 text-green-700' :
                        patient.status === 'admitted' ? 'bg-blue-100 text-blue-700' :
                        patient.status === 'pending_triage' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {patient.status === 'transferred_to_opd' ? 'Transferred from ER' :
                         patient.status === 'pending_triage' ? 'Pending' : patient.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bed Allocation */}
      <div className="bg-card rounded-lg border shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground mb-1">Bed Allocation</h2>
          <p className="text-sm text-muted-foreground">
            {occupiedBeds} occupied · {availableBeds} available
          </p>
        </div>

        {/* Bed Grid */}
        <div className="grid grid-cols-5 md:grid-cols-10 gap-4">
          {bedGrid.map((bed: BedGridItem) => (
            <div
              key={bed.number}
              className={`
                aspect-square rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all
                ${bed.status === 'occupied'
                  ? 'bg-blue-100 border-blue-300 hover:bg-blue-200'
                  : bed.status === 'maintenance'
                  ? 'bg-yellow-100 border-yellow-300'
                  : 'bg-background border-border hover:bg-muted/30'
                }
              `}
            >
              <Bed className={`h-6 w-6 mb-1 ${bed.status === 'occupied' ? 'text-blue-600' : bed.status === 'maintenance' ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${bed.status === 'occupied' ? 'text-blue-700' : bed.status === 'maintenance' ? 'text-yellow-700' : 'text-muted-foreground'}`}>
                {bed.bedNumber || bed.number}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-100 border-2 border-blue-300"></div>
            <span className="text-sm text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-background border-2 border-border"></div>
            <span className="text-sm text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-100 border-2 border-yellow-300"></div>
            <span className="text-sm text-muted-foreground">Maintenance</span>
          </div>
        </div>
      </div>

      {/* Bed Capacity and AI Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bed Capacity */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Bed Capacity</h2>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bed className="w-4 h-4" />
                  <span>OPD Beds</span>
                </div>
                <span className="font-medium text-foreground">
                  {availableBeds} of {totalBeds} available
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">OPD Utilization</span>
                  <span className="font-semibold text-2xl text-foreground">
                    {totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Predictions & Alerts */}
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">AI Predictions & Alerts</h2>

          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">⚠</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    {specialty === 'cardiology' ? 'High cardiac case load expected' : 'Walk-in patient surge predicted in 45 mins'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    3 min ago
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs">ℹ</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Consultation delay risk: {specialty === 'cardiology' ? '2' : '3'} patients
                  </p>
                  <p className="text-xs text-blue-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    8 min ago
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Detail Modal */}
      <OPDPatientModal
        patient={selectedPatient}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) opdPatientSnapshotRef.current = null
        }}
      />

      {/* New Registration Modal */}
      <NewRegistrationModal
        open={registrationOpen}
        onOpenChange={setRegistrationOpen}
        defaultDepartmentName={departmentName}
      />
    </div>
  )
}
