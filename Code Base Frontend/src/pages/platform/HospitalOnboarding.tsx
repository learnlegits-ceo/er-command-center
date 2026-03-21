import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, CreditCard, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateHospital, usePlans } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'

const STEPS = ['Hospital Profile', 'Select Plan', 'Admin User', 'Review & Confirm']

export default function HospitalOnboarding() {
  const { isPlatformAdmin } = useUser()
  const navigate = useNavigate()
  const { data: plans } = usePlans()
  const createHospital = useCreateHospital()
  const [step, setStep] = useState(0)

  const [form, setForm] = useState({
    name: '', code: '', address: '', phone: '', email: '',
    plan_id: '',
    admin_name: '', admin_email: '', admin_password: '', admin_phone: '',
  })

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  const update = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const canProceed = () => {
    if (step === 0) return form.name && form.code
    if (step === 1) return form.plan_id
    if (step === 2) return form.admin_name && form.admin_email && form.admin_password
    return true
  }

  const handleSubmit = async () => {
    try {
      await createHospital.mutateAsync({
        name: form.name,
        code: form.code,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        plan_id: form.plan_id,
        initial_admin: {
          name: form.admin_name,
          email: form.admin_email,
          password: form.admin_password,
          phone: form.admin_phone || undefined,
        },
      })
      alert('Hospital onboarded successfully!')
      navigate('/platform/hospitals')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create hospital')
    }
  }

  const selectedPlan = (plans || []).find((p: any) => p.id === form.plan_id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platform/hospitals')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Hospital</h1>
          <p className="text-sm text-muted-foreground">Onboard a new hospital to the platform</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Step 0: Hospital Profile */}
          {step === 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Hospital Profile</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hospital Name *</Label>
                  <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="City General Hospital" />
                </div>
                <div>
                  <Label>Code *</Label>
                  <Input value={form.code} onChange={(e) => update('code', e.target.value.toUpperCase())} placeholder="CGH001" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Medical Center Drive" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91-9876543210" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="admin@hospital.com" />
                </div>
              </div>
            </>
          )}

          {/* Step 1: Select Plan */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Select Subscription Plan</h2>
              </div>
              <div className="grid gap-3">
                {(plans || []).filter((p: any) => p.is_active).map((plan: any) => (
                  <div
                    key={plan.id}
                    onClick={() => update('plan_id', plan.id)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      form.plan_id === plan.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">&#8377;{plan.base_price.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">/month</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{plan.max_users === 0 ? 'Unlimited' : plan.included_users} users included</span>
                      <span>{plan.max_beds === 0 ? 'Unlimited' : plan.included_beds} beds included</span>
                      <span>{plan.max_departments === 0 ? 'Unlimited' : plan.max_departments} departments</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Admin User */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Hospital Admin User</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-3">This person will be the hospital's administrator who manages staff, beds, and settings.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={form.admin_name} onChange={(e) => update('admin_name', e.target.value)} placeholder="Dr. Rajesh Kumar" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.admin_phone} onChange={(e) => update('admin_phone', e.target.value)} placeholder="+91-9876543210" />
                </div>
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.admin_email} onChange={(e) => update('admin_email', e.target.value)} placeholder="admin@hospital.com" />
              </div>
              <div>
                <Label>Password *</Label>
                <Input type="password" value={form.admin_password} onChange={(e) => update('admin_password', e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 digit" />
              </div>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Review & Confirm</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Hospital</p>
                  <p className="font-medium">{form.name} ({form.code})</p>
                  {form.address && <p className="text-xs text-muted-foreground">{form.address}</p>}
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Plan</p>
                  <p className="font-medium">{selectedPlan?.name} — &#8377;{selectedPlan?.base_price.toLocaleString()}/month</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Admin</p>
                  <p className="font-medium">{form.admin_name}</p>
                  <p className="text-xs text-muted-foreground">{form.admin_email}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed()}>
            Next <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createHospital.isPending}>
            {createHospital.isPending ? 'Creating...' : 'Create Hospital'}
          </Button>
        )}
      </div>
    </div>
  )
}
