import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AppProvider } from '@/contexts/AppContext'
import { useUser } from '@/contexts/UserContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Dashboard from '@/pages/Dashboard'
import OPD from '@/pages/OPD'
import Patients from '@/pages/Patients'
import Beds from '@/pages/Beds'
import Admin from '@/pages/Admin'
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import Alerts from '@/pages/Alerts'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import './App.css'

// Route guard: redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useUser()

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AppProvider>
      <ErrorBoundary>
      <Routes>
        {/* Auth routes - outside Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* App routes - protected and inside Layout */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<ProtectedRoute><Layout><Navigate to="/emergency/unit-a" replace /></Layout></ProtectedRoute>} />
        <Route path="/emergency/:unit" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
        <Route path="/opd/:specialty" element={<ProtectedRoute><Layout><OPD /></Layout></ProtectedRoute>} />
        <Route path="/patients" element={<ProtectedRoute><Layout><Patients /></Layout></ProtectedRoute>} />
        <Route path="/beds" element={<ProtectedRoute><Layout><Beds /></Layout></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Layout><Alerts /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><Layout><div>Resources Page (Coming Soon)</div></Layout></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Layout><Admin /></Layout></ProtectedRoute>} />
        <Route path="*" element={<div className="flex items-center justify-center min-h-screen">404 - Page Not Found</div>} />
      </Routes>
      </ErrorBoundary>
    </AppProvider>
  )
}

export default App
