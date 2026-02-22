import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getDefaultAvatar } from '@/lib/utils'
import { endpoints } from '@/lib/api'

export type UserRole = 'nurse' | 'doctor' | 'admin'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar: string
  department?: string
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  isAuthLoading: boolean
  // Permission helpers
  canRegisterPatients: boolean
  canAddNurseNotes: boolean
  canEditNurseNotes: boolean
  canAddDoctorComments: boolean
  canEditDoctorComments: boolean
  canManageUsers: boolean
  canAccessAdmin: boolean
  canTriage: boolean
  canPrescribe: boolean
  canDischarge: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

// Helper to persist user to localStorage
function persistUser(user: User | null) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user))
  } else {
    localStorage.removeItem('currentUser')
  }
}

// Helper to load user from localStorage (fast initial load)
function loadPersistedUser(): User | null {
  try {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    localStorage.removeItem('currentUser')
  }
  return null
}

export function UserProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage for instant restore on refresh
  const [user, setUserState] = useState<User | null>(loadPersistedUser)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Wrapper that also persists to localStorage
  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    persistUser(newUser)
    if (!newUser) {
      // Clear tokens on logout
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
    }
  }

  // On mount, validate the token and restore session from backend
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('authToken')
      if (!token) {
        // No token - clear any stale user data
        setUserState(null)
        localStorage.removeItem('currentUser')
        setIsAuthLoading(false)
        return
      }

      try {
        // Validate token by calling /auth/me
        const response = await endpoints.auth.getCurrentUser()
        if (response.data.success && response.data.data) {
          const userData = response.data.data
          const restoredUser: User = {
            id: userData.id,
            name: userData.name,
            role: userData.role as UserRole,
            avatar: userData.avatar || getDefaultAvatar(userData.name, userData.role),
            department: userData.department || 'General'
          }
          setUserState(restoredUser)
          persistUser(restoredUser)
        } else {
          // Token invalid - clear everything
          setUserState(null)
          localStorage.removeItem('currentUser')
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
        }
      } catch {
        // Token expired or server error
        // Keep persisted user if available for offline resilience
        const persistedUser = loadPersistedUser()
        if (!persistedUser) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
        }
      } finally {
        setIsAuthLoading(false)
      }
    }

    restoreSession()
  }, [])

  // Compute permissions based on role
  const permissions = {
    canRegisterPatients: user?.role === 'nurse' || user?.role === 'admin',
    canAddNurseNotes: user?.role === 'nurse' || user?.role === 'admin',
    canEditNurseNotes: user?.role === 'nurse' || user?.role === 'admin',
    canAddDoctorComments: user?.role === 'doctor' || user?.role === 'admin',
    canEditDoctorComments: user?.role === 'doctor' || user?.role === 'admin',
    canManageUsers: user?.role === 'admin',
    canAccessAdmin: user?.role === 'admin',
    canTriage: user?.role === 'nurse' || user?.role === 'admin',
    canPrescribe: user?.role === 'doctor' || user?.role === 'admin',
    canDischarge: user?.role === 'doctor' || user?.role === 'nurse' || user?.role === 'admin',
  }

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        isAuthLoading,
        ...permissions,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
