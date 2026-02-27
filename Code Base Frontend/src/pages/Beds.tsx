import { useState } from 'react'
import { BedCard } from '@/components/BedCard'
import { Button } from '@/components/ui/button'
import { useBeds, useUpdateBedStatus, useAssignBed, useReleaseBed } from '@/hooks/useBeds'
import { usePatients } from '@/hooks/usePatients'
import { Filter, Loader2, AlertCircle, X, User, Bed as BedIcon, RefreshCw, UserMinus, UserPlus } from 'lucide-react'
import { Bed } from '@/data/types'

export default function Beds() {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [actionError, setActionError] = useState('')
  const [assignPatientId, setAssignPatientId] = useState('')

  const { data: beds, isLoading, error } = useBeds()
  const { data: patientsResponse } = usePatients({ status: 'all' })
  const updateStatus = useUpdateBedStatus()
  const assignBed = useAssignBed()
  const releaseBed = useReleaseBed()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading beds...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive font-medium">Failed to load beds</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    )
  }

  // API returns {success: true, data: beds_array}
  const bedsList = beds?.data || []

  const filteredBeds = bedsList.filter((bed: Bed) => {
    const bedType = bed.bedType || bed.type
    const matchesType = filterType === 'all' || bedType === filterType
    const matchesStatus = filterStatus === 'all' || bed.status === filterStatus
    return matchesType && matchesStatus
  })

  const stats = {
    total: bedsList.length,
    available: bedsList.filter((b: Bed) => b.status === 'available').length,
    occupied: bedsList.filter((b: Bed) => b.status === 'occupied').length,
    maintenance: bedsList.filter((b: Bed) => b.status === 'maintenance').length,
  }

  // Patients without a bed assigned — for the assign dropdown
  const rawPatients: any[] = patientsResponse?.data?.patients || []
  const unassignedPatients = rawPatients.filter(
    (p: any) => !p.bedId && p.status !== 'discharged' && p.status !== 'transferred_to_opd'
  )

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedBed) return
    setActionError('')
    try {
      await updateStatus.mutateAsync({ id: selectedBed.id, status: newStatus })
      setSelectedBed(null)
    } catch {
      setActionError('Failed to update bed status.')
    }
  }

  const handleAssign = async () => {
    if (!selectedBed || !assignPatientId) return
    setActionError('')
    try {
      await assignBed.mutateAsync({ bedId: selectedBed.id, patientId: assignPatientId })
      setSelectedBed(null)
      setAssignPatientId('')
    } catch {
      setActionError('Failed to assign bed. Please try again.')
    }
  }

  const handleRelease = async () => {
    if (!selectedBed) return
    setActionError('')
    try {
      await releaseBed.mutateAsync(selectedBed.id)
      setSelectedBed(null)
    } catch {
      setActionError('Failed to release bed.')
    }
  }

  const isBusy = updateStatus.isPending || assignBed.isPending || releaseBed.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bed Management</h1>
        <p className="text-muted-foreground">Monitor and manage bed availability across the ER</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm text-muted-foreground">Total Beds</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-lg border bg-green-50 p-4">
          <div className="text-sm text-green-700">Available</div>
          <div className="text-2xl font-bold text-green-700">{stats.available}</div>
        </div>
        <div className="rounded-lg border bg-orange-50 p-4">
          <div className="text-sm text-orange-700">Occupied</div>
          <div className="text-2xl font-bold text-orange-700">{stats.occupied}</div>
        </div>
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="text-sm text-gray-700">Maintenance</div>
          <div className="text-2xl font-bold text-gray-700">{stats.maintenance}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Type:</span>
          <div className="flex gap-2">
            {['all', 'icu', 'general'].map((t) => (
              <Button key={t} size="sm" variant={filterType === t ? 'default' : 'outline'} onClick={() => setFilterType(t)}>
                {t === 'all' ? 'All' : t.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex gap-2">
            {['all', 'available', 'occupied'].map((s) => (
              <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} onClick={() => setFilterStatus(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Beds Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredBeds.map((bed: Bed) => (
          <BedCard
            key={bed.id}
            bed={bed}
            onClick={() => { setSelectedBed(bed); setActionError(''); setAssignPatientId('') }}
          />
        ))}
      </div>

      {filteredBeds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No beds found matching your criteria</p>
        </div>
      )}

      {/* Bed Detail Panel */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedBed.status === 'available' ? 'bg-green-100' :
                  selectedBed.status === 'occupied' ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  <BedIcon className={`w-5 h-5 ${
                    selectedBed.status === 'available' ? 'text-green-600' :
                    selectedBed.status === 'occupied' ? 'text-orange-600' : 'text-gray-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Bed {selectedBed.bedNumber || selectedBed.number}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedBed.bedType || selectedBed.type || 'General'} · {selectedBed.ward || 'Ward'} · Floor {selectedBed.floor || 1}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedBed(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                selectedBed.status === 'available' ? 'bg-green-100 text-green-700' :
                selectedBed.status === 'occupied' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {selectedBed.status.charAt(0).toUpperCase() + selectedBed.status.slice(1)}
              </span>
            </div>

            {/* Patient Info (if occupied) */}
            {selectedBed.status === 'occupied' && selectedBed.patient && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">Current Patient</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{(selectedBed.patient as any).name}</p>
                <p className="text-xs text-muted-foreground">{(selectedBed.patient as any).complaint || ''}</p>
              </div>
            )}

            {/* Last Cleaned */}
            {selectedBed.lastCleaned && (
              <p className="text-xs text-muted-foreground mb-4">
                Last cleaned: {new Date(selectedBed.lastCleaned).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}

            {/* Error */}
            {actionError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {actionError}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              {/* Assign to patient (available beds only) */}
              {selectedBed.status === 'available' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Assign to Patient</label>
                  <select
                    value={assignPatientId}
                    onChange={(e) => setAssignPatientId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select a patient...</option>
                    {unassignedPatients.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.complaint || 'No complaint'}
                      </option>
                    ))}
                  </select>
                  <Button
                    className="w-full"
                    onClick={handleAssign}
                    disabled={!assignPatientId || isBusy}
                  >
                    {assignBed.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    Assign Bed
                  </Button>
                </div>
              )}

              {/* Release bed (occupied beds only) */}
              {selectedBed.status === 'occupied' && (
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={handleRelease}
                  disabled={isBusy}
                >
                  {releaseBed.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserMinus className="w-4 h-4 mr-2" />}
                  Release Bed
                </Button>
              )}

              {/* Status change buttons */}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Change Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {['available', 'maintenance', 'cleaning'].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={selectedBed.status === s ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(s)}
                      disabled={selectedBed.status === s || isBusy}
                      className="text-xs"
                    >
                      {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
