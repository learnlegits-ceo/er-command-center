import { useState, useRef, useEffect } from 'react'
import { User, Mail, Phone, Building2, Shield, Camera, Stethoscope, Syringe, Upload, Video, Pencil, Check, X, Loader2 } from 'lucide-react'
import { useUser } from '@/contexts/UserContext'
import { Button } from '@/components/ui/button'
import { endpoints } from '@/lib/api'

export default function Profile() {
  const { user, setUser } = useUser()
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Reset draft fields when the underlying user changes (e.g. after save)
  useEffect(() => {
    if (user) {
      setDraftName(user.name || '')
      setDraftPhone(user.phone || '')
    }
  }, [user?.name, user?.phone])

  // Auto-dismiss success toast
  useEffect(() => {
    if (saveSuccess) {
      const t = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(t)
    }
  }, [saveSuccess])

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'doctor': return <Stethoscope className="w-6 h-6 text-blue-600" />
      case 'nurse': return <Syringe className="w-6 h-6 text-green-600" />
      case 'admin': return <Shield className="w-6 h-6 text-purple-600" />
      default: return <User className="w-6 h-6" />
    }
  }

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'doctor': return 'bg-blue-100 text-blue-700'
      case 'nurse': return 'bg-green-100 text-green-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleSave = async () => {
    setSaveError('')
    const name = draftName.trim()
    if (!name || name.length < 2) {
      setSaveError('Name must be at least 2 characters')
      return
    }
    // Phone is optional; if entered, must be 10 digits (allowing +91 prefix)
    const phoneDigits = (draftPhone || '').replace(/^\+91\s*/, '').replace(/\D/g, '')
    if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
      setSaveError('Phone number must be exactly 10 digits')
      return
    }
    const normalizedPhone = phoneDigits ? `+91 ${phoneDigits}` : ''

    setSaveLoading(true)
    try {
      const response = await endpoints.users.updateMe({
        name,
        phone: normalizedPhone || undefined,
      })
      if (response.data?.success) {
        if (user) {
          setUser({ ...user, name, phone: normalizedPhone })
        }
        setIsEditing(false)
        setSaveSuccess(true)
      } else {
        setSaveError('Failed to save profile. Please try again.')
      }
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail || 'Failed to save profile. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setDraftName(user?.name || '')
    setDraftPhone(user?.phone || '')
    setSaveError('')
    setIsEditing(false)
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Not Signed In</h2>
          <p className="text-muted-foreground">Please sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium shadow-lg">
          Profile updated successfully!
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancelEdit} variant="ghost" size="sm" disabled={saveLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" disabled={saveLoading}>
              {saveLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {saveLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {/* Inline error */}
      {saveError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {saveError}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-card border rounded-lg overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />

        {/* Avatar and Basic Info */}
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-12">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-card border-4 border-card overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <User className="w-10 h-10 text-secondary-foreground" />
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>

              {/* Photo Options Dropdown */}
              {showPhotoOptions && (
                <div className="absolute top-full left-0 mt-2 bg-card border rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          if (user) {
                            setUser({ ...user, avatar: reader.result as string })
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                      setShowPhotoOptions(false)
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Photo
                  </button>
                  <button
                    onClick={() => {
                      navigator.mediaDevices?.getUserMedia({ video: true })
                        .then(() => {
                          alert('Camera access granted! In a full implementation, this would open a camera capture modal.')
                        })
                        .catch(() => {
                          alert('Camera access denied or not available.')
                        })
                      setShowPhotoOptions(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Take Photo
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor()}`}>
                  {getRoleIcon()}
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{user.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Personal Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.replace(/[^a-zA-Z\s\-'.]/g, ''))}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Enter your full name"
                autoFocus
              />
            ) : (
              <p className="text-foreground">{user.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <p className="text-foreground">{user.email || 'Not set'}</p>
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed. Contact your admin if you need to update it.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            {isEditing ? (
              <div className="flex">
                <span className="inline-flex items-center px-3 py-2 bg-muted border border-r-0 border-input rounded-l-lg text-sm text-muted-foreground font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  value={draftPhone.replace(/^\+91\s*/, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setDraftPhone(`+91 ${digits}`)
                  }}
                  className="w-full px-3 py-2 bg-background border border-input rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="98765 43210"
                  maxLength={10}
                />
              </div>
            ) : (
              <p className="text-foreground">{user.phone || 'Not set'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Department
            </label>
            <p className="text-foreground">{user.department}</p>
            {isEditing && (
              <p className="text-xs text-muted-foreground mt-1">
                Department changes must be made by an admin.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Role Info Card */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Role & Permissions</h3>
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="p-3 bg-card rounded-lg">
            {getRoleIcon()}
          </div>
          <div>
            <p className="font-medium text-foreground">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            <p className="text-sm text-muted-foreground">
              {user.role === 'nurse' && 'Can manage patient care, add nurse notes, and register patients'}
              {user.role === 'doctor' && 'Can diagnose, prescribe, add doctor comments, and discharge patients'}
              {user.role === 'admin' && 'Full system access including staff management and system settings'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
