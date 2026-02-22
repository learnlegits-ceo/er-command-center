import { Bed } from '@/data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getStatusColor } from '@/lib/utils'
import { Bed as BedIcon } from 'lucide-react'

interface BedCardProps {
  bed: Bed
  onClick?: () => void
}

export function BedCard({ bed, onClick }: BedCardProps) {
  // Support both new backend structure and legacy structure
  const bedNumber = bed.bedNumber || bed.number || 'N/A'
  const bedType = bed.bedType || bed.type || 'general'
  const location = bed.ward || bed.location || 'N/A'
  const floor = bed.floor || 'N/A'
  const patientInfo = bed.patient || (bed.patientId ? { patientId: bed.patientId, name: '', id: '' } : null)

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        onClick && 'hover:border-primary',
        bed.status === 'occupied' && 'border-orange-300',
        bed.status === 'available' && 'border-green-300'
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BedIcon className="h-5 w-5" />
            <CardTitle className="text-lg">{bedNumber}</CardTitle>
          </div>
          <span
            className={cn(
              'px-2 py-1 text-xs font-semibold rounded-full',
              getStatusColor(bed.status)
            )}
          >
            {bed.status.toUpperCase()}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium uppercase">{bedType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ward:</span>
            <span className="font-medium">{location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Floor:</span>
            <span className="font-medium">{floor}</span>
          </div>
          {bed.department && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{bed.department.name}</span>
            </div>
          )}
          {patientInfo && (
            <div className="mt-2 pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {patientInfo.name ? `Patient: ${patientInfo.name}` : `Patient ID: ${patientInfo.patientId}`}
              </span>
            </div>
          )}
          {bed.lastCleaned && (
            <div className="text-xs text-muted-foreground">
              Last cleaned: {new Date(bed.lastCleaned).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
