// Patient types
export interface Patient {
  id: string
  patientId: string
  name: string
  age: number
  gender: string
  phone: string
  email?: string
  status: 'active' | 'admitted' | 'discharged' | 'pending_triage' | 'transferred_to_opd'
  priority: 1 | 2 | 3 | 4 | 5
  priorityLabel?: string
  complaint: string
  admittedAt: string
  dischargedAt?: string
  department?: { name: string }
  assignedDoctor?: { name: string }
  assignedNurse?: { name: string }
  bed?: { bedNumber: string }
  photo?: string | null
  vitals?: Vitals
  // Legacy fields for backward compatibility
  medicalRecordNumber?: string
  admissionTime?: string
  chiefComplaint?: string
  assignedBed?: string
}

export interface Vitals {
  hr?: number
  bp?: string
  spo2?: number
  temp?: number
  rr?: number
  // Legacy fields for backward compatibility
  heartRate?: number
  bloodPressure?: string
  temperature?: number
  oxygenSaturation?: number
  respiratoryRate?: number
  lastUpdated?: string
}

// Bed types
export interface Bed {
  id: string
  bedNumber: string
  bedType: 'icu' | 'general' | 'isolation' | 'emergency'
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning'
  floor: string
  ward: string
  department?: { name: string }
  patient?: {
    id: string
    patientId: string
    name: string
  }
  lastCleaned?: string
  isActive: boolean
  // Legacy fields for backward compatibility
  number?: string
  type?: 'icu' | 'general' | 'isolation' | 'observation' | 'emergency'
  location?: string
  patientId?: string
}

// Staff types
export interface Staff {
  id: string
  name: string
  role: 'doctor' | 'nurse' | 'technician' | 'administrator'
  specialization?: string
  status: 'available' | 'busy' | 'off-duty'
  shift: 'morning' | 'afternoon' | 'night'
  assignedPatients: string[]
}

// Alert types
export interface Alert {
  id: string
  title: string
  message: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  status: 'unread' | 'read' | 'acknowledged' | 'resolved' | 'dismissed'
  patientId?: string
  patient?: {
    id: string
    patientId: string
    name: string
    uhi?: string
    euhi?: string
    department?: string
    bed?: string
  }
  createdAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  // Legacy fields for backward compatibility
  type?: 'emergency' | 'warning' | 'info'
}

// Resource types
export interface Resource {
  id: string
  name: string
  type: 'equipment' | 'medication' | 'supply'
  quantity: number
  minQuantity: number
  unit: string
  location: string
  status: 'available' | 'low' | 'critical'
}

// Dashboard stats
export interface DashboardStats {
  totalPatients: number
  criticalPatients: number
  availableBeds: number
  occupiedBeds: number
  availableStaff: number
  activeAlerts: number
  averageWaitTime: number
}
