import { useState, useEffect } from 'react'
import { UserPlus, Users, Shield, Stethoscope, Syringe, Edit2, Trash2, Search, Eye, EyeOff, X, Camera, User as UserIcon, Loader2, AlertTriangle, Phone, CheckCircle2, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser, UserRole } from '@/contexts/UserContext'
import { endpoints } from '@/lib/api'
import { getDefaultAvatar } from '@/lib/utils'

interface StaffMember {
  id: string
  name: string
  role: UserRole
  email: string
  department: string
  phone: string
  avatar: string
  status: 'active' | 'inactive'
  joinDate: string
}

// Helper to create data URI from SVG string
const svgToDataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`

// Doctor avatars - realistic illustrations with lab coat & stethoscope
const doctorMale1 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#e8f4fc"/><ellipse cx="60" cy="45" rx="22" ry="24" fill="#f5d0a9"/><path d="M38 42c0-14 10-26 22-26s22 12 22 26" fill="#3b2314"/><path d="M42 42c0-10 8-20 18-20s18 10 18 20" fill="#4a3020"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M56 54c2 2.5 6 2.5 8 0" stroke="#c4846c" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="50" rx="3" ry="2" fill="#e8b896"/><path d="M32 75v35h56v-35c0-14-12.5-24-28-24s-28 10-28 24z" fill="#fff"/><path d="M60 51l-12 24h24z" fill="#fff"/><path d="M48 75l12-24 12 24" fill="none" stroke="#d1d5db" stroke-width="0.8"/><line x1="60" y1="75" x2="60" y2="110" stroke="#d1d5db" stroke-width="0.8"/><path d="M32 75c0-14 12.5-24 28-24s28 10 28 24" fill="none" stroke="#d1d5db" stroke-width="1"/><path d="M42 85c-4 0-7 3-7 6s3 6 7 6" stroke="#4a90d9" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="42" cy="97" r="3" fill="#4a90d9"/><path d="M42 91h18" stroke="#4a90d9" stroke-width="2" stroke-linecap="round"/><circle cx="46" cy="80" r="1.5" fill="#4a90d9"/><circle cx="46" cy="85" r="1.5" fill="#4a90d9"/></svg>`)

const doctorFemale1 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#e8f4fc"/><ellipse cx="60" cy="45" rx="21" ry="23" fill="#f5d0a9"/><path d="M35 48c0-16 11-30 25-30s25 14 25 30c0 2-1 4-2 5 1-4 1-8 0-12-2-12-10-20-23-20s-21 8-23 20c-1 4-1 8 0 12-1-1-2-3-2-5z" fill="#5c3a1e"/><path d="M35 48c-1 8 2 16 6 20" stroke="#5c3a1e" stroke-width="3" fill="none"/><path d="M85 48c1 8-2 16-6 20" stroke="#5c3a1e" stroke-width="3" fill="none"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M55 54c2.5 3 7.5 3 10 0" stroke="#c4846c" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="60" cy="50" rx="3" ry="2" fill="#e8b896"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#fff"/><path d="M60 54l-10 24h20z" fill="#fff"/><path d="M50 78l10-24 10 24" fill="none" stroke="#d1d5db" stroke-width="0.8"/><line x1="60" y1="78" x2="60" y2="110" stroke="#d1d5db" stroke-width="0.8"/><path d="M70 88c4 0 7 3 7 6s-3 6-7 6" stroke="#4a90d9" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="70" cy="100" r="3" fill="#4a90d9"/><path d="M70 94h-16" stroke="#4a90d9" stroke-width="2" stroke-linecap="round"/></svg>`)

const doctorMale2 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#eef2ff"/><ellipse cx="60" cy="45" rx="22" ry="24" fill="#d4a87c"/><path d="M38 38c0-12 10-22 22-22s22 10 22 22" fill="#1a1a2e"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#1a1a2e"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#1a1a2e"/><path d="M56 54c2 2.5 6 2.5 8 0" stroke="#b8896e" stroke-width="1.8" fill="none" stroke-linecap="round"/><rect x="50" y="57" width="20" height="4" rx="1" fill="#b8896e"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#fff"/><path d="M60 54l-10 24h20z" fill="#e8f4fc"/><circle cx="60" cy="82" r="3" fill="#3b82f6"/><line x1="60" y1="85" x2="60" y2="110" stroke="#d1d5db" stroke-width="0.8"/><path d="M32 78c0-14 12.5-24 28-24s28 10 28 24" fill="none" stroke="#d1d5db" stroke-width="1"/></svg>`)

const doctorFemale2 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#eef2ff"/><ellipse cx="60" cy="45" rx="21" ry="23" fill="#d4a87c"/><path d="M37 40c0-14 10-26 23-26s23 12 23 26" fill="#8b4513"/><path d="M37 40c-2 10 0 20 5 26" stroke="#8b4513" stroke-width="4" fill="none"/><path d="M83 40c2 10 0 20-5 26" stroke="#8b4513" stroke-width="4" fill="none"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M55 54c2.5 3 7.5 3 10 0" stroke="#b8896e" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#fff"/><path d="M60 54l-10 24h20z" fill="#fff"/><circle cx="60" cy="82" r="3" fill="#6366f1"/><line x1="60" y1="85" x2="60" y2="110" stroke="#d1d5db" stroke-width="0.8"/></svg>`)

// Nurse avatars - with scrubs and nurse cap
const nurseFemale1 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#ecfdf5"/><ellipse cx="60" cy="46" rx="21" ry="23" fill="#f5d0a9"/><path d="M39 44c0-14 9-26 21-26s21 12 21 26" fill="#2c1810"/><path d="M39 44c-1 8 1 16 4 20" stroke="#2c1810" stroke-width="3" fill="none"/><path d="M81 44c1 8-1 16-4 20" stroke="#2c1810" stroke-width="3" fill="none"/><rect x="44" y="18" width="32" height="10" rx="3" fill="#fff" stroke="#16a34a" stroke-width="1.5"/><line x1="60" y1="19" x2="60" y2="27" stroke="#16a34a" stroke-width="2"/><line x1="56" y1="23" x2="64" y2="23" stroke="#16a34a" stroke-width="2"/><ellipse cx="52" cy="45" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="45" rx="2.5" ry="3" fill="#2c1810"/><path d="M55 55c2.5 3 7.5 3 10 0" stroke="#c4846c" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 80v30h56v-30c0-14-12.5-24-28-24s-28 10-28 24z" fill="#86efac"/><path d="M60 56l-8 18h16z" fill="#86efac"/><path d="M50 80v-4l10-20 10 20v4" fill="none" stroke="#16a34a" stroke-width="0.8"/><rect x="54" y="82" width="12" height="16" rx="2" fill="#fff" stroke="#16a34a" stroke-width="0.8"/><text x="60" y="93" text-anchor="middle" font-size="8" font-family="Arial" fill="#16a34a" font-weight="bold">RN</text></svg>`)

const nurseFemale2 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#ecfdf5"/><ellipse cx="60" cy="46" rx="21" ry="23" fill="#d4a87c"/><path d="M38 42c0-14 10-26 22-26s22 12 22 26" fill="#5c3a1e"/><path d="M38 42c-2 10 0 22 6 28" stroke="#5c3a1e" stroke-width="3" fill="none"/><path d="M82 42c2 10 0 22-6 28" stroke="#5c3a1e" stroke-width="3" fill="none"/><rect x="44" y="16" width="32" height="10" rx="3" fill="#fff" stroke="#059669" stroke-width="1.5"/><line x1="60" y1="17" x2="60" y2="25" stroke="#059669" stroke-width="2"/><line x1="56" y1="21" x2="64" y2="21" stroke="#059669" stroke-width="2"/><ellipse cx="52" cy="45" rx="2.5" ry="3" fill="#1a1a2e"/><ellipse cx="68" cy="45" rx="2.5" ry="3" fill="#1a1a2e"/><path d="M55 55c2.5 3 7.5 3 10 0" stroke="#b8896e" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 80v30h56v-30c0-14-12.5-24-28-24s-28 10-28 24z" fill="#6ee7b7"/><path d="M60 56l-8 18h16z" fill="#6ee7b7"/></svg>`)

const nurseMale1 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#ecfdf5"/><ellipse cx="60" cy="45" rx="22" ry="24" fill="#f5d0a9"/><path d="M38 40c0-13 10-24 22-24s22 11 22 24" fill="#3b2314"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M56 54c2 2.5 6 2.5 8 0" stroke="#c4846c" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#86efac"/><path d="M60 54l-8 18h16z" fill="#86efac"/><path d="M50 78v-6l10-18 10 18v6" fill="none" stroke="#16a34a" stroke-width="0.8"/><rect x="54" y="80" width="12" height="16" rx="2" fill="#fff" stroke="#16a34a" stroke-width="0.8"/><text x="60" y="91" text-anchor="middle" font-size="8" font-family="Arial" fill="#16a34a" font-weight="bold">RN</text></svg>`)

const nurseMale2 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#ecfdf5"/><ellipse cx="60" cy="45" rx="22" ry="24" fill="#d4a87c"/><path d="M38 38c0-12 10-22 22-22s22 10 22 22" fill="#1a1a2e"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#1a1a2e"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#1a1a2e"/><path d="M56 54c2 2.5 6 2.5 8 0" stroke="#b8896e" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#6ee7b7"/><path d="M60 54l-8 18h16z" fill="#6ee7b7"/><path d="M50 78v-6l10-18 10 18v6" fill="none" stroke="#059669" stroke-width="0.8"/></svg>`)

// Admin avatars - with formal attire
const adminAvatar1 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#f3f0ff"/><ellipse cx="60" cy="45" rx="22" ry="24" fill="#f5d0a9"/><path d="M38 40c0-13 10-24 22-24s22 11 22 24" fill="#3b2314"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M56 54c2 2.5 6 2.5 8 0" stroke="#c4846c" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#4c1d95"/><path d="M60 54l-10 24h20z" fill="#fff"/><line x1="60" y1="78" x2="60" y2="110" stroke="#6d28d9" stroke-width="1"/><circle cx="60" cy="82" r="2" fill="#6d28d9"/></svg>`)

const adminAvatar2 = svgToDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="60" fill="#f3f0ff"/><ellipse cx="60" cy="45" rx="21" ry="23" fill="#d4a87c"/><path d="M37 42c0-14 10-26 23-26s23 12 23 26" fill="#5c3a1e"/><path d="M37 42c-2 10 0 20 5 24" stroke="#5c3a1e" stroke-width="3" fill="none"/><path d="M83 42c2 10 0 20-5 24" stroke="#5c3a1e" stroke-width="3" fill="none"/><ellipse cx="52" cy="44" rx="2.5" ry="3" fill="#2c1810"/><ellipse cx="68" cy="44" rx="2.5" ry="3" fill="#2c1810"/><path d="M55 54c2.5 3 7.5 3 10 0" stroke="#b8896e" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M32 78v32h56v-32c0-14-12.5-24-28-24s-28 10-28 24z" fill="#5b21b6"/><path d="M60 54l-10 24h20z" fill="#fff"/><line x1="60" y1="78" x2="60" y2="110" stroke="#7c3aed" stroke-width="1"/><circle cx="60" cy="82" r="2" fill="#7c3aed"/></svg>`)

const AVATAR_OPTIONS = [
  { id: 'doctor-m1', url: doctorMale1, label: 'Doctor - Male', category: 'doctor' },
  { id: 'doctor-f1', url: doctorFemale1, label: 'Doctor - Female', category: 'doctor' },
  { id: 'doctor-m2', url: doctorMale2, label: 'Doctor - Male 2', category: 'doctor' },
  { id: 'doctor-f2', url: doctorFemale2, label: 'Doctor - Female 2', category: 'doctor' },
  { id: 'nurse-f1', url: nurseFemale1, label: 'Nurse - Female', category: 'nurse' },
  { id: 'nurse-f2', url: nurseFemale2, label: 'Nurse - Female 2', category: 'nurse' },
  { id: 'nurse-m1', url: nurseMale1, label: 'Nurse - Male', category: 'nurse' },
  { id: 'nurse-m2', url: nurseMale2, label: 'Nurse - Male 2', category: 'nurse' },
  { id: 'admin-1', url: adminAvatar1, label: 'Admin - Male', category: 'admin' },
  { id: 'admin-2', url: adminAvatar2, label: 'Admin - Female', category: 'admin' },
]

interface PoliceCase {
  id: string
  caseNumber: string
  patientName: string
  caseType: string
  status: 'pending' | 'contacted' | 'resolved'
  description?: string
  createdAt: string
  contactedAt?: string
  resolvedAt?: string
  firNumber?: string
  resolution?: string
}

export default function Admin() {
  const { user, canManageUsers } = useUser()
  const [activeAdminTab, setActiveAdminTab] = useState<'staff' | 'police' | 'audit'>('staff')

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'nurse' as UserRole,
    email: '',
    password: '',
    department: 'Emergency',
    phone: '',
    avatar: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [stats, setStats] = useState({ total: 0, doctors: 0, nurses: 0, admins: 0 })
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [customAvatarUrl, setCustomAvatarUrl] = useState('')

  // Police cases state
  const [policeCases, setPoliceCases] = useState<PoliceCase[]>([])
  const [policeCasesLoading, setPoliceCasesLoading] = useState(false)
  const [policeFilter, setPoliceFilter] = useState<string>('all')
  const [contactModal, setContactModal] = useState<PoliceCase | null>(null)
  const [resolveModal, setResolveModal] = useState<PoliceCase | null>(null)
  const [contactDetails, setContactDetails] = useState({ officerName: '', badgeNumber: '' })
  const [resolveDetails, setResolveDetails] = useState({ resolution: '', firNumber: '' })
  const [policeActionLoading, setPoliceActionLoading] = useState(false)
  const [policeError, setPoliceError] = useState('')
  const [policeSuccess, setPoliceSuccess] = useState('')

  // Load staff from backend
  const loadStaff = async () => {
    setIsLoading(true)
    try {
      const response = await endpoints.admin.getStaff()
      if (response.data.success) {
        const { staff: staffData, counts } = response.data.data
        setStaff(staffData.map((s: any) => ({
          id: s.id,
          name: s.name,
          role: s.role as UserRole,
          email: s.email,
          department: s.department || 'General',
          phone: s.phone || '',
          avatar: s.avatar || getDefaultAvatar(s.name, s.role),
          status: s.status as 'active' | 'inactive',
          joinDate: s.joinedAt || ''
        })))
        setStats(counts)
      }
    } catch (err: any) {
      console.error('Failed to load staff:', err)
      setError('Failed to load staff data. Using offline mode.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (canManageUsers) {
      loadStaff()
    }
  }, [canManageUsers])

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  // Load police cases when tab switches to police
  const loadPoliceCases = async () => {
    setPoliceCasesLoading(true)
    setPoliceError('')
    try {
      const response = await endpoints.policeCases.getAll()
      const data = response.data?.data
      setPoliceCases(Array.isArray(data) ? data : [])
    } catch {
      setPoliceError('Failed to load police cases.')
    } finally {
      setPoliceCasesLoading(false)
    }
  }

  useEffect(() => {
    if (activeAdminTab === 'police') loadPoliceCases()
  }, [activeAdminTab])

  // Audit log state
  interface AuditEntry { id: string; action: string; entityType: string; entityId: string | null; userName: string; userRole: string; ipAddress: string | null; createdAt: string }
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditEntityFilter, setAuditEntityFilter] = useState('')
  const AUDIT_LIMIT = 50

  const loadAuditLogs = async (offset = 0, entityType = '') => {
    setAuditLoading(true)
    try {
      const response = await endpoints.admin.getAuditLogs({
        limit: AUDIT_LIMIT,
        offset,
        ...(entityType ? { entity_type: entityType } : {})
      })
      if (response.data.success) {
        setAuditLogs(response.data.data.logs)
        setAuditTotal(response.data.data.total)
        setAuditOffset(offset)
      }
    } catch {
      // silently fail — audit log is non-critical
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (activeAdminTab === 'audit') loadAuditLogs(0, auditEntityFilter)
  }, [activeAdminTab])

  useEffect(() => {
    if (policeSuccess) {
      const t = setTimeout(() => setPoliceSuccess(''), 4000)
      return () => clearTimeout(t)
    }
  }, [policeSuccess])

  const handleContactPolice = async () => {
    if (!contactModal) return
    setPoliceActionLoading(true)
    setPoliceError('')
    try {
      await endpoints.policeCases.contactPolice(contactModal.id, contactDetails)
      setContactModal(null)
      setContactDetails({ officerName: '', badgeNumber: '' })
      setPoliceSuccess('Police contacted successfully.')
      loadPoliceCases()
    } catch {
      setPoliceError('Failed to update case. Please try again.')
    } finally {
      setPoliceActionLoading(false)
    }
  }

  const handleResolveCase = async () => {
    if (!resolveModal || !resolveDetails.resolution) return
    setPoliceActionLoading(true)
    setPoliceError('')
    try {
      await endpoints.policeCases.resolve(resolveModal.id, resolveDetails)
      setResolveModal(null)
      setResolveDetails({ resolution: '', firNumber: '' })
      setPoliceSuccess('Case resolved successfully.')
      loadPoliceCases()
    } catch {
      setPoliceError('Failed to resolve case. Please try again.')
    } finally {
      setPoliceActionLoading(false)
    }
  }

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the Admin Panel.</p>
          <p className="text-sm text-muted-foreground mt-2">Current role: {user?.role}</p>
        </div>
      </div>
    )
  }

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-4 h-4 text-blue-600" />
      case 'nurse':
        return <Syringe className="w-4 h-4 text-green-600" />
      case 'admin':
        return <Shield className="w-4 h-4 text-purple-600" />
    }
  }

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-100 text-blue-700'
      case 'nurse':
        return 'bg-green-100 text-green-700'
      case 'admin':
        return 'bg-purple-100 text-purple-700'
    }
  }

  const getSelectedAvatar = () => {
    if (newStaff.avatar) return newStaff.avatar
    if (newStaff.name) return getDefaultAvatar(newStaff.name, newStaff.role)
    return ''
  }

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) return

    setIsSubmitting(true)
    setError('')

    try {
      const avatarUrl = newStaff.avatar || getDefaultAvatar(newStaff.name, newStaff.role)

      const response = await endpoints.admin.createStaff({
        name: newStaff.name,
        email: newStaff.email,
        password: newStaff.password,
        role: newStaff.role,
        phone: newStaff.phone || undefined,
        avatar_url: avatarUrl
      })

      if (response.data.success) {
        const created = response.data.data
        const newMember: StaffMember = {
          id: created.id,
          name: created.name,
          role: created.role as UserRole,
          email: created.email,
          department: created.department || newStaff.department,
          phone: created.phone || newStaff.phone,
          avatar: created.avatar || avatarUrl,
          status: created.status as 'active' | 'inactive',
          joinDate: created.joinedAt || new Date().toISOString().split('T')[0]
        }

        setStaff([newMember, ...staff])
        setStats(prev => ({
          ...prev,
          total: prev.total + 1,
          doctors: newStaff.role === 'doctor' ? prev.doctors + 1 : prev.doctors,
          nurses: newStaff.role === 'nurse' ? prev.nurses + 1 : prev.nurses,
          admins: newStaff.role === 'admin' ? prev.admins + 1 : prev.admins
        }))
        setNewStaff({ name: '', role: 'nurse', email: '', password: '', department: 'Emergency', phone: '', avatar: '' })
        setShowAddModal(false)
        setShowAvatarPicker(false)
        setCustomAvatarUrl('')
        setSuccessMsg(`${created.name} has been added successfully. They can now login with their email and password.`)
      }
    } catch (err: any) {
      console.error('Failed to create staff:', err)
      const errorMessage = err.response?.data?.detail || 'Failed to create staff member. Please try again.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await endpoints.admin.updateStaff(editingStaff.id, {
        name: editingStaff.name,
        status: editingStaff.status
      })

      if (response.data.success) {
        setStaff(staff.map(s => s.id === editingStaff.id ? editingStaff : s))
        setEditingStaff(null)
        setSuccessMsg('Staff member updated successfully.')
      }
    } catch (err: any) {
      console.error('Failed to update staff:', err)
      const errorMessage = err.response?.data?.detail || 'Failed to update staff member.'
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return

    try {
      const response = await endpoints.admin.deleteStaff(id)
      if (response.data.success) {
        const deleted = staff.find(s => s.id === id)
        setStaff(staff.filter(s => s.id !== id))
        if (deleted) {
          setStats(prev => ({
            ...prev,
            total: prev.total - 1,
            doctors: deleted.role === 'doctor' ? prev.doctors - 1 : prev.doctors,
            nurses: deleted.role === 'nurse' ? prev.nurses - 1 : prev.nurses,
            admins: deleted.role === 'admin' ? prev.admins - 1 : prev.admins
          }))
        }
        setSuccessMsg('Staff member removed successfully.')
      }
    } catch (err: any) {
      console.error('Failed to delete staff:', err)
      const errorMessage = err.response?.data?.detail || 'Failed to remove staff member.'
      setError(errorMessage)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage staff, users, and system settings</p>
        </div>
        <Button onClick={() => { setShowAddModal(true); setError('') }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <span className="text-sm">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && !showAddModal && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveAdminTab('staff')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeAdminTab === 'staff'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Management
        </button>
        <button
          onClick={() => setActiveAdminTab('police')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeAdminTab === 'police'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Police / MLC Cases
        </button>
        <button
          onClick={() => setActiveAdminTab('audit')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeAdminTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          Audit Log
        </button>
      </div>

      {/* ── STAFF TAB ── */}
      {activeAdminTab === 'staff' && <>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.doctors}</p>
              <p className="text-xs text-muted-foreground">Doctors</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Syringe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.nurses}</p>
              <p className="text-xs text-muted-foreground">Nurses</p>
            </div>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{stats.admins}</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Management */}
      <div className="bg-card border rounded-lg">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Staff Management</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading staff...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Staff Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {searchQuery ? 'No staff members match your search.' : 'No staff members found. Add your first staff member above.'}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full object-cover bg-muted" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{member.department}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{member.phone}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingStaff(member)}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Add New Staff Member</h3>
              <button onClick={() => { setShowAddModal(false); setShowAvatarPicker(false); setError('') }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error inside modal */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Profile Icon Section */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Profile Icon</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {getSelectedAvatar() ? (
                      <img
                        src={getSelectedAvatar()}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover bg-muted border-2 border-border"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {showAvatarPicker ? 'Hide Icons' : 'Choose Icon'}
                    </Button>
                    {newStaff.avatar && (
                      <button
                        type="button"
                        onClick={() => setNewStaff({ ...newStaff, avatar: '' })}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>

                {/* Avatar Picker Grid */}
                {showAvatarPicker && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                    {/* Recommended icons for selected role */}
                    {(() => {
                      const roleIcons = AVATAR_OPTIONS.filter(a => a.category === newStaff.role)
                      const otherIcons = AVATAR_OPTIONS.filter(a => a.category !== newStaff.role)
                      return (
                        <>
                          <p className="text-xs font-medium text-foreground mb-2">
                            Recommended for {newStaff.role.charAt(0).toUpperCase() + newStaff.role.slice(1)}:
                          </p>
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {roleIcons.map((avatar) => (
                              <button
                                key={avatar.id}
                                type="button"
                                onClick={() => {
                                  setNewStaff({ ...newStaff, avatar: avatar.url })
                                  setShowAvatarPicker(false)
                                }}
                                className={`p-1.5 rounded-lg border-2 transition-all hover:scale-105 flex flex-col items-center gap-1 ${
                                  newStaff.avatar === avatar.url
                                    ? 'border-primary bg-primary/10'
                                    : 'border-transparent hover:border-border'
                                }`}
                                title={avatar.label}
                              >
                                <img src={avatar.url} alt={avatar.label} className="w-14 h-14 rounded-full" />
                                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{avatar.label.split(' - ')[1]}</span>
                              </button>
                            ))}
                          </div>

                          {otherIcons.length > 0 && (
                            <>
                              <p className="text-xs text-muted-foreground mb-2 pt-2 border-t">Other icons:</p>
                              <div className="grid grid-cols-6 gap-2">
                                {otherIcons.map((avatar) => (
                                  <button
                                    key={avatar.id}
                                    type="button"
                                    onClick={() => {
                                      setNewStaff({ ...newStaff, avatar: avatar.url })
                                      setShowAvatarPicker(false)
                                    }}
                                    className={`p-1 rounded-lg border-2 transition-all hover:scale-105 ${
                                      newStaff.avatar === avatar.url
                                        ? 'border-primary bg-primary/10'
                                        : 'border-transparent hover:border-border'
                                    }`}
                                    title={avatar.label}
                                  >
                                    <img src={avatar.url} alt={avatar.label} className="w-10 h-10 rounded-full" />
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )
                    })()}

                    {/* Custom URL option */}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Or enter a custom image URL:</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={customAvatarUrl}
                          onChange={(e) => setCustomAvatarUrl(e.target.value)}
                          placeholder="https://example.com/photo.jpg"
                          className="flex-1 px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (customAvatarUrl) {
                              setNewStaff({ ...newStaff, avatar: customAvatarUrl })
                              setShowAvatarPicker(false)
                              setCustomAvatarUrl('')
                            }
                          }}
                          disabled={!customAvatarUrl}
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email (used for login)"
                />
                <p className="text-xs text-muted-foreground mt-1">This email will be used as the login username</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter login password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">This password will be used for login</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                <select
                  value={newStaff.department}
                  onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Emergency">Emergency</option>
                  <option value="OPD">OPD</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Login info box */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700 font-medium">Login Credentials</p>
              <p className="text-xs text-blue-600 mt-1">
                The staff member will be able to login with the email and password you set here. Make sure to share these credentials securely.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setShowAvatarPicker(false); setError('') }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <Button
                onClick={handleAddStaff}
                disabled={!newStaff.name || !newStaff.email || !newStaff.password || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Add Staff'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Edit Staff Member</h3>
              <button onClick={() => setEditingStaff(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar display */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
              <img src={editingStaff.avatar} alt={editingStaff.name} className="w-12 h-12 rounded-full object-cover bg-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">{editingStaff.name}</p>
                <p className="text-xs text-muted-foreground">{editingStaff.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Department</label>
                <select
                  value={editingStaff.department}
                  onChange={(e) => setEditingStaff({ ...editingStaff, department: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Emergency">Emergency</option>
                  <option value="OPD">OPD</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={editingStaff.status}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <Button onClick={handleUpdateStaff} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      </> /* end staff tab */}

      {/* ── POLICE CASES TAB ── */}
      {activeAdminTab === 'police' && (
        <div className="space-y-6">
          {/* Police feedback messages */}
          {policeSuccess && (
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              <span className="text-sm">{policeSuccess}</span>
              <button onClick={() => setPoliceSuccess('')}><X className="w-4 h-4" /></button>
            </div>
          )}
          {policeError && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <span className="text-sm">{policeError}</span>
              <button onClick={() => setPoliceError('')}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Police case stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Cases', value: policeCases.length, color: 'bg-card', icon: <FileText className="w-5 h-5 text-foreground" /> },
              { label: 'Pending', value: policeCases.filter(c => c.status === 'pending').length, color: 'bg-red-50', icon: <Clock className="w-5 h-5 text-red-600" /> },
              { label: 'Contacted', value: policeCases.filter(c => c.status === 'contacted').length, color: 'bg-yellow-50', icon: <Phone className="w-5 h-5 text-yellow-600" /> },
              { label: 'Resolved', value: policeCases.filter(c => c.status === 'resolved').length, color: 'bg-green-50', icon: <CheckCircle2 className="w-5 h-5 text-green-600" /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className={`${color} border rounded-lg p-4 flex items-center gap-3`}>
                <div className="p-2 bg-white/60 rounded-lg">{icon}</div>
                <div>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {['all', 'pending', 'contacted', 'resolved'].map(s => (
              <Button key={s} size="sm" variant={policeFilter === s ? 'default' : 'outline'}
                onClick={() => setPoliceFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>

          {/* Cases table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">MLC / Police Cases</h2>
              <p className="text-xs text-muted-foreground mt-1">Medico-legal cases flagged by nursing staff during patient registration</p>
            </div>

            {policeCasesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading cases...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      {['Case No.', 'Patient', 'Type', 'Status', 'Reported', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {policeCases
                      .filter(c => policeFilter === 'all' || c.status === policeFilter)
                      .length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                          No police cases found
                        </td>
                      </tr>
                    ) : (
                      policeCases
                        .filter(c => policeFilter === 'all' || c.status === policeFilter)
                        .map(c => (
                          <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono font-medium text-foreground">{c.caseNumber}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-foreground font-medium">{c.patientName}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                {c.caseType?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                c.status === 'pending' ? 'bg-red-100 text-red-700' :
                                c.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {c.status === 'pending' && (
                                  <button
                                    onClick={() => { setContactModal(c); setPoliceError('') }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                  >
                                    <Phone className="w-3 h-3" />
                                    Contact Police
                                  </button>
                                )}
                                {(c.status === 'pending' || c.status === 'contacted') && (
                                  <button
                                    onClick={() => { setResolveModal(c); setPoliceError('') }}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Resolve
                                  </button>
                                )}
                                {c.status === 'resolved' && c.firNumber && (
                                  <span className="text-xs text-muted-foreground">FIR: {c.firNumber}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ── */}
      {activeAdminTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">System Audit Log</h2>
              <p className="text-sm text-muted-foreground">Track all actions across the system ({auditTotal} total entries)</p>
            </div>
          </div>

          {/* Entity type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filter by type:</span>
            {['', 'patient', 'user', 'bed', 'prescription', 'police_case'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setAuditEntityFilter(type)
                  loadAuditLogs(0, type)
                }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                  auditEntityFilter === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary'
                }`}
              >
                {type === '' ? 'All' : type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Log table */}
          {auditLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : auditLogs.length > 0 ? (
            <>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entity</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.map((log) => {
                      const d = new Date(log.createdAt)
                      const timeStr = isNaN(d.getTime()) ? log.createdAt : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      const isDestructive = /delete|remove|deactivate|reset/i.test(log.action)
                      return (
                        <tr key={log.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeStr}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{log.userName}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                log.userRole === 'doctor' ? 'bg-blue-100 text-blue-700' :
                                log.userRole === 'nurse' ? 'bg-green-100 text-green-700' :
                                log.userRole === 'admin' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>{log.userRole}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${isDestructive ? 'text-red-600' : 'text-foreground'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className="text-muted-foreground capitalize">{log.entityType}</span>
                            {log.entityId && <span className="ml-1 font-mono text-[10px] text-muted-foreground/60">{log.entityId.slice(0, 8)}…</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{log.ipAddress || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Showing {auditOffset + 1}–{Math.min(auditOffset + AUDIT_LIMIT, auditTotal)} of {auditTotal}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadAuditLogs(Math.max(0, auditOffset - AUDIT_LIMIT), auditEntityFilter)}
                    disabled={auditOffset === 0 || auditLoading}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => loadAuditLogs(auditOffset + AUDIT_LIMIT, auditEntityFilter)}
                    disabled={auditOffset + AUDIT_LIMIT >= auditTotal || auditLoading}
                    className="px-3 py-1.5 text-xs border rounded-lg hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No audit log entries found.</div>
          )}
        </div>
      )}

      {/* Contact Police Modal */}
      {contactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Contact Police</h3>
              <button onClick={() => setContactModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Case <span className="font-mono font-medium text-foreground">{contactModal.caseNumber}</span> — {contactModal.patientName}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Officer Name</label>
                <input
                  type="text"
                  value={contactDetails.officerName}
                  onChange={e => setContactDetails({ ...contactDetails, officerName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Officer full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Badge / ID Number</label>
                <input
                  type="text"
                  value={contactDetails.badgeNumber}
                  onChange={e => setContactDetails({ ...contactDetails, badgeNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. KA/1234"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setContactModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <Button onClick={handleContactPolice} disabled={policeActionLoading}>
                {policeActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
                Mark as Contacted
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Case Modal */}
      {resolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Resolve Case</h3>
              <button onClick={() => setResolveModal(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Case <span className="font-mono font-medium text-foreground">{resolveModal.caseNumber}</span> — {resolveModal.patientName}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Resolution Notes <span className="text-red-500">*</span></label>
                <textarea
                  value={resolveDetails.resolution}
                  onChange={e => setResolveDetails({ ...resolveDetails, resolution: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Describe how the case was resolved..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">FIR Number (optional)</label>
                <input
                  type="text"
                  value={resolveDetails.firNumber}
                  onChange={e => setResolveDetails({ ...resolveDetails, firNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. FIR/2024/001"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <Button onClick={handleResolveCase} disabled={policeActionLoading || !resolveDetails.resolution}>
                {policeActionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Resolve Case
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
