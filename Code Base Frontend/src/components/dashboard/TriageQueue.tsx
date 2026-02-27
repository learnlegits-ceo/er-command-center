import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Clock, Camera, Bed as BedIcon, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useBeds, useAssignBed } from '@/hooks/useBeds';

interface Patient {
  id: string;
  name: string;
  age: string;
  gender: string;
  avatar?: string;
  assignedDoctor: string;
  uhi: string;
  euhi: string;
  complaint: string;
  vitals: {
    hr: number;
    bp: string;
    spo2: number;
    temp: number;
    rr: number;
  };
  vitalsSource: 'manual' | 'ocr';
  triageLevel: number;
  triageLabel: string;
  triageReasoning?: string;
  triageRecommendations?: string[];
  bed?: string;
  updatedBy: {
    name: string;
    role?: string;
    avatar: string;
    time: string;
  };
  waitTime: string;
  arrivedAt?: string;
}

interface TriageQueueProps {
  patients: Patient[];
  onNewArrival: () => void;
  onPatientClick: (patient: Patient) => void;
}

function BedPicker({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { data: bedsData } = useBeds()
  const assignBed = useAssignBed()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const available = (bedsData?.data || []).filter((b: any) => b.status === 'available')

  const handleAssign = async (bedId: string) => {
    await assignBed.mutateAsync({ bedId, patientId })
    onClose()
  }

  return (
    <div ref={ref} className="absolute z-50 mt-1 w-48 bg-card border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
      {available.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No beds available</p>
      ) : (
        available.map((bed: any) => (
          <button
            key={bed.id}
            onClick={(e) => { e.stopPropagation(); handleAssign(bed.id) }}
            disabled={assignBed.isPending}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted flex items-center gap-2 disabled:opacity-50"
          >
            {assignBed.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <BedIcon className="w-3 h-3 text-green-600" />
            )}
            <span className="font-medium">{bed.bedNumber}</span>
            <span className="text-muted-foreground capitalize">{bed.bedType || 'general'}</span>
          </button>
        ))
      )}
    </div>
  )
}

export function TriageQueue({ patients, onNewArrival, onPatientClick }: TriageQueueProps) {
  const { canRegisterPatients } = useUser();
  const [bedPickerFor, setBedPickerFor] = useState<string | null>(null);

  const getTriageBadgeColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4:
        return 'bg-green-100 text-green-800 border-green-200';
      case 0:
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">AI Triage Queue</h2>
          <p className="text-sm text-muted-foreground">{patients.length} active patients in queue</p>
        </div>
        {canRegisterPatients && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onNewArrival}>
              <Plus className="mr-2 h-4 w-4" />
              New Arrival
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Patient</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Identifiers</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Complaint</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Vitals</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Triage</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Bed</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Updated By</th>
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Arrival</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.map((patient) => (
              <tr
                key={patient.id}
                onClick={() => onPatientClick(patient)}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {patient.avatar && (
                      <img
                        src={patient.avatar}
                        alt={patient.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = '';
                        }}
                      />
                    )}
                    <div
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-foreground"
                      style={patient.avatar ? { display: 'none' } : undefined}
                    >
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.age} · {patient.assignedDoctor}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">UHI:</span>
                      <span className="text-xs text-foreground font-mono">{patient.uhi}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">EUHI:</span>
                      <span className="text-xs text-foreground font-mono">{patient.euhi}</span>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <p className="text-sm text-foreground">{patient.complaint}</p>
                </td>
                <td className="p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">HR</span>
                      <span className={`font-medium ${patient.vitals.hr && (patient.vitals.hr < 60 || patient.vitals.hr > 100) ? 'text-red-600' : 'text-foreground'}`}>{patient.vitals.hr || '-'}</span>
                      <span className="text-muted-foreground">BP</span>
                      <span className="font-medium text-foreground">{patient.vitals.bp || '-'}</span>
                      <span className="text-muted-foreground">SpO₂</span>
                      <span className={`font-medium ${patient.vitals.spo2 && patient.vitals.spo2 < 95 ? 'text-red-600' : 'text-foreground'}`}>
                        {patient.vitals.spo2 ? `${patient.vitals.spo2}%` : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Temp</span>
                      <span className="font-medium text-foreground">{patient.vitals.temp ? `${patient.vitals.temp}°C` : '-'}</span>
                      <span className="text-muted-foreground">RR</span>
                      <span className="font-medium text-foreground">{patient.vitals.rr ? `${patient.vitals.rr}/min` : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {patient.vitalsSource === 'ocr' ? (
                        <>
                          <Camera className="w-3 h-3 text-blue-600" />
                          <span className="text-[10px] text-blue-600">OCR captured</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual entry</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getTriageBadgeColor(patient.triageLevel)}`}
                      title={patient.triageReasoning || 'No reasoning available'}
                    >
                      {patient.triageLabel}
                    </span>
                    {patient.triageReasoning && (
                      <p className="text-[10px] text-muted-foreground max-w-[200px] truncate" title={patient.triageReasoning}>
                        {patient.triageReasoning}
                      </p>
                    )}
                  </div>
                </td>
                <td className="p-3 relative">
                  {patient.bed ? (
                    <div className="flex items-center gap-1">
                      <BedIcon className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-foreground">{patient.bed}</span>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setBedPickerFor(bedPickerFor === patient.id ? null : patient.id) }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        + Assign Bed
                      </button>
                      {bedPickerFor === patient.id && (
                        <BedPicker patientId={patient.id} onClose={() => setBedPickerFor(null)} />
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={patient.updatedBy.avatar}
                      alt={patient.updatedBy.name}
                      className="w-6 h-6 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = '';
                      }}
                    />
                    <div
                      className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-foreground"
                      style={{ display: 'none' }}
                    >
                      {patient.updatedBy.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-foreground">{patient.updatedBy.name}</p>
                        {patient.updatedBy.role && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            patient.updatedBy.role === 'doctor' ? 'bg-blue-100 text-blue-700' :
                            patient.updatedBy.role === 'nurse' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {patient.updatedBy.role === 'doctor' ? 'Dr.' :
                             patient.updatedBy.role === 'nurse' ? 'Nurse' :
                             patient.updatedBy.role}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{patient.updatedBy.time}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{patient.waitTime}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
