import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { DashboardHeader } from './dashboard/DashboardHeader'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  // Determine department name based on pathname
  const getDepartmentName = () => {
    const pathname = location.pathname

    // Emergency departments
    if (pathname.includes('/emergency/unit-a')) return 'Emergency Department – Unit A'
    if (pathname.includes('/emergency/unit-b')) return 'Emergency Department – Unit B'
    if (pathname.includes('/emergency/trauma')) return 'Trauma Center'
    if (pathname.includes('/emergency/care-unit')) return 'Emergency Care Unit'
    if (pathname.includes('/emergency/icu')) return 'Intensive Care Unit'
    if (pathname.includes('/emergency/general-ward')) return 'General Ward'
    if (pathname.includes('/emergency/pediatrics')) return 'Pediatrics'

    // OPD departments
    if (pathname.includes('/opd/general')) return 'General OPD'
    if (pathname.includes('/opd/cardiology')) return 'Cardiology OPD'

    return 'Emergency Department – Unit A'
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <DashboardHeader departmentName={getDepartmentName()} />
      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
