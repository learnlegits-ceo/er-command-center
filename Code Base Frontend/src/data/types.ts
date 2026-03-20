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

// ─── SaaS Platform Types ──────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  name: string
  code: string
  description?: string
  includedUsers: number
  includedBeds: number
  maxUsers: number
  maxBeds: number
  maxDepartments: number
  basePrice: number
  pricePerExtraUser: number
  pricePerExtraBed: number
  annualDiscountPercent: number
  billingCycle: 'monthly' | 'yearly'
  currency: string
  features: Record<string, any>
  isActive: boolean
  sortOrder: number
}

export interface Tenant {
  id: string
  name: string
  code: string
  domain?: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  plan?: SubscriptionPlan
  planName?: string
  subscriptionStatus: 'active' | 'inactive' | 'suspended'
  subscriptionStartsAt?: string
  subscriptionEndsAt?: string
  isActive: boolean
  userCount?: number
  bedCount?: number
  departmentCount?: number
  createdAt?: string
}

export interface BedTypePricing {
  id: string | null
  bedType: string
  costPerDay: number
  currency: string
  isActive: boolean
  status: 'configured' | 'not_set'
}

export interface UsageStats {
  activeUsers: number
  totalBeds: number
  occupiedBeds: number
  aiTriageCalls: number
  planLimit: {
    maxUsers: number
    maxBeds: number
    includedUsers: number
    includedBeds: number
  }
}

export interface Invoice {
  id: string
  invoiceNumber: string
  periodStart: string
  periodEnd: string
  baseAmount: number
  userAmount: number
  bedAmount: number
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  currency: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  dueDate?: string
  paidAt?: string
  paymentMethod?: string
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>
  createdAt?: string
}

export interface PlatformDashboardData {
  totalHospitals: number
  totalUsers: number
  totalBeds: number
  occupiedBeds: number
  hospitalsByPlan: Array<{ plan: string; count: number }>
  recentSignups: Array<{ id: string; name: string; code: string; subscriptionStatus: string; createdAt: string }>
}
