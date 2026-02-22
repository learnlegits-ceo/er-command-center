import { Patient } from '@/data/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, getStatusColor, getPriorityColor, getPriorityLabel } from '@/lib/utils'
import { Activity, User, AlertCircle } from 'lucide-react'

interface PatientCardProps {
  patient: Patient
  onClick?: () => void
}

export function PatientCard({ patient, onClick }: PatientCardProps) {
  // Get patient data with fallbacks for legacy fields
  const patientIdDisplay = patient.patientId || patient.medicalRecordNumber || 'N/A'
  const complaintDisplay = patient.complaint || patient.chiefComplaint || 'Not specified'
  const bedDisplay = patient.bed?.bedNumber || patient.assignedBed
  const doctorDisplay = typeof patient.assignedDoctor === 'string'
    ? patient.assignedDoctor
    : patient.assignedDoctor?.name

  // Priority label
  const priorityLabel = patient.priorityLabel || getPriorityLabel(patient.priority)

  return (
    <Card
      className={cn('cursor-pointer hover:shadow-md transition-shadow', onClick && 'hover:border-primary')}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle className="text-lg">{patient.name}</CardTitle>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <span
              className={cn(
                'px-2 py-1 text-xs font-semibold rounded-full',
                getStatusColor(patient.status)
              )}
            >
              {patient.status.replace('_', ' ').toUpperCase()}
            </span>
            {patient.priority && (
              <span
                className={cn(
                  'px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1',
                  getPriorityColor(patient.priority)
                )}
              >
                {patient.priority <= 2 && <AlertCircle className="h-3 w-3" />}
                {priorityLabel}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Patient ID:</span>
            <span className="font-medium">{patientIdDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Age:</span>
            <span className="font-medium">{patient.age} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gender:</span>
            <span className="font-medium capitalize">{patient.gender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Complaint:</span>
            <span className="font-medium text-right">{complaintDisplay}</span>
          </div>
          {bedDisplay && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bed:</span>
              <span className="font-medium">{bedDisplay}</span>
            </div>
          )}
          {doctorDisplay && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doctor:</span>
              <span className="font-medium">{doctorDisplay}</span>
            </div>
          )}
          {patient.department && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{patient.department.name}</span>
            </div>
          )}
          {patient.vitals && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4" />
                <span className="font-medium">Vitals</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(patient.vitals.hr || patient.vitals.heartRate) && (
                  <div>HR: {patient.vitals.hr || patient.vitals.heartRate} bpm</div>
                )}
                {(patient.vitals.bp || patient.vitals.bloodPressure) && (
                  <div>BP: {patient.vitals.bp || patient.vitals.bloodPressure}</div>
                )}
                {(patient.vitals.temp || patient.vitals.temperature) && (
                  <div>Temp: {patient.vitals.temp || patient.vitals.temperature}°C</div>
                )}
                {(patient.vitals.spo2 || patient.vitals.oxygenSaturation) && (
                  <div>SpO2: {patient.vitals.spo2 || patient.vitals.oxygenSaturation}%</div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
