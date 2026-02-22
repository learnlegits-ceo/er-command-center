import { useState } from 'react'
import { BedCard } from '@/components/BedCard'
import { Button } from '@/components/ui/button'
import { useBeds } from '@/hooks/useBeds'
import { Filter, Loader2, AlertCircle } from 'lucide-react'
import { Bed } from '@/data/types'

export default function Beds() {
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: beds, isLoading, error } = useBeds()

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
            <Button
              size="sm"
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterType === 'icu' ? 'default' : 'outline'}
              onClick={() => setFilterType('icu')}
            >
              ICU
            </Button>
            <Button
              size="sm"
              variant={filterType === 'general' ? 'default' : 'outline'}
              onClick={() => setFilterType('general')}
            >
              General
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'available' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('available')}
            >
              Available
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'occupied' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('occupied')}
            >
              Occupied
            </Button>
          </div>
        </div>
      </div>

      {/* Beds Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredBeds.map((bed: Bed) => (
          <BedCard
            key={bed.id}
            bed={bed}
            onClick={() => console.log('Bed clicked:', bed.id)}
          />
        ))}
      </div>

      {filteredBeds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No beds found matching your criteria</p>
        </div>
      )}
    </div>
  )
}
