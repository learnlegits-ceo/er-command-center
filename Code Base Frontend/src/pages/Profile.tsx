import { useState, useRef } from 'react'
import { User, Mail, Phone, Building2, Shield, Camera, Save, Stethoscope, Syringe, Upload, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/contexts/UserContext'

export default function Profile() {
  const { user, setUser } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [showPhotoOptions, setShowPhotoOptions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.id ? `${user.name.toLowerCase().replace(/\s+/g, '.')}@hospital.com` : '',
    phone: '+91 98765 43210',
    department: user?.department || '',
  })

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

  const handleSave = () => {
    if (user) {
      setUser({
        ...user,
        name: formData.name,
        department: formData.department,
      })
    }
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account information</p>
      </div>

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
                      // Request camera access
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
            <Button
              variant={isEditing ? "default" : "outline"}
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              ) : (
                'Edit Profile'
              )}
            </Button>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
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
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-foreground">{formData.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <p className="text-foreground">{formData.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Department
            </label>
            {isEditing ? (
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Emergency">Emergency</option>
                <option value="OPD">OPD</option>
                <option value="Cardiology">Cardiology</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Administration">Administration</option>
              </select>
            ) : (
              <p className="text-foreground">{user.department}</p>
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

      {/* Cancel button when editing */}
      {isEditing && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
