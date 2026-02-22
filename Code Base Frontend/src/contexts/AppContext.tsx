import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Patient, Bed, Staff, Alert } from '@/data/types'

interface AppContextType {
  patients: Patient[]
  setPatients: (patients: Patient[]) => void
  beds: Bed[]
  setBeds: (beds: Bed[]) => void
  staff: Staff[]
  setStaff: (staff: Staff[]) => void
  alerts: Alert[]
  setAlerts: (alerts: Alert[]) => void
  selectedPatient: Patient | null
  setSelectedPatient: (patient: Patient | null) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [beds, setBeds] = useState<Bed[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  return (
    <AppContext.Provider
      value={{
        patients,
        setPatients,
        beds,
        setBeds,
        staff,
        setStaff,
        alerts,
        setAlerts,
        selectedPatient,
        setSelectedPatient,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
