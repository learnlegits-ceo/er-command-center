import { useState } from 'react'
import { PatientCard } from '@/components/PatientCard'
import { Button } from '@/components/ui/button'
import { usePatients } from '@/hooks/usePatients'
import { Plus, Search, Loader2, AlertCircle } from 'lucide-react'
import { Patient } from '@/data/types'

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<number | 'all'>('all')

  // Fetch patients from backend API
  // API returns {success: true, data: {patients: [...], pagination: {...}}}
  // Pass status='all' to fetch all patients including pending_triage
  const { data: patientsResponse, isLoading, error } = usePatients({ status: 'all' })
  const patients = patientsResponse?.data?.patients || []

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
        <Button>
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
                onClick={() => console.log('Patient clicked:', patient.id)}
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
    </div>
  )
}
