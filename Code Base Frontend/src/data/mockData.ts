import { Patient, Bed, Staff, Alert, Resource, DashboardStats } from './types'

export const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    age: 45,
    gender: 'male',
    medicalRecordNumber: 'MRN001',
    status: 'critical',
    admissionTime: new Date().toISOString(),
    chiefComplaint: 'Chest pain',
    assignedBed: 'ICU-101',
    assignedDoctor: 'Dr. Smith',
    vitals: {
      heartRate: 120,
      bloodPressure: '140/90',
      temperature: 38.5,
      oxygenSaturation: 92,
      respiratoryRate: 22,
      lastUpdated: new Date().toISOString(),
    },
  },
  {
    id: '2',
    name: 'Jane Smith',
    age: 32,
    gender: 'female',
    medicalRecordNumber: 'MRN002',
    status: 'stable',
    admissionTime: new Date().toISOString(),
    chiefComplaint: 'Abdominal pain',
    assignedBed: 'GEN-205',
  },
]

export const mockBeds: Bed[] = [
  {
    id: '1',
    number: 'ICU-101',
    type: 'icu',
    status: 'occupied',
    location: 'ICU Wing',
    floor: 1,
    patientId: '1',
  },
  {
    id: '2',
    number: 'GEN-205',
    type: 'general',
    status: 'occupied',
    location: 'General Ward',
    floor: 2,
    patientId: '2',
  },
  {
    id: '3',
    number: 'ICU-102',
    type: 'icu',
    status: 'available',
    location: 'ICU Wing',
    floor: 1,
  },
]

export const mockStaff: Staff[] = [
  {
    id: '1',
    name: 'Dr. Smith',
    role: 'doctor',
    specialization: 'Cardiology',
    status: 'busy',
    shift: 'morning',
    assignedPatients: ['1'],
  },
  {
    id: '2',
    name: 'Nurse Johnson',
    role: 'nurse',
    status: 'available',
    shift: 'morning',
    assignedPatients: ['2'],
  },
]

export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'emergency',
    priority: 'high',
    title: 'Critical Patient Alert',
    message: 'Patient John Doe showing declining vitals',
    patientId: '1',
    createdAt: new Date().toISOString(),
    status: 'active',
  },
]

export const mockResources: Resource[] = [
  {
    id: '1',
    name: 'Ventilators',
    type: 'equipment',
    quantity: 5,
    minQuantity: 10,
    unit: 'units',
    location: 'ICU',
    status: 'low',
  },
  {
    id: '2',
    name: 'IV Fluids',
    type: 'supply',
    quantity: 50,
    minQuantity: 20,
    unit: 'bags',
    location: 'Pharmacy',
    status: 'available',
  },
]

export const mockDashboardStats: DashboardStats = {
  totalPatients: 24,
  criticalPatients: 3,
  availableBeds: 8,
  occupiedBeds: 16,
  availableStaff: 12,
  activeAlerts: 2,
  averageWaitTime: 45,
}
