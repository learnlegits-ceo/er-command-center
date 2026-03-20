import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { usePlans, useCreatePlan, useUpdatePlan } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export default function PlatformPlans() {
  const { isPlatformAdmin } = useUser()
  const { data: plans, isLoading } = usePlans()
  const createPlan = useCreatePlan()
  const updatePlan = useUpdatePlan()
  const { toast } = useToast()
  const [editingPlan, setEditingPlan] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [form, setForm] = useState({
    name: '', code: '', description: '',
    included_users: 10, included_beds: 20,
    max_users: 20, max_beds: 50, max_departments: 5,
    base_price: 9999, price_per_extra_user: 299, price_per_extra_bed: 499,
  })

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleCreate = async () => {
    try {
      await createPlan.mutateAsync(form)
      toast({ title: 'Plan created' })
      setShowCreate(false)
      setForm({ name: '', code: '', description: '', included_users: 10, included_beds: 20, max_users: 20, max_beds: 50, max_departments: 5, base_price: 9999, price_per_extra_user: 299, price_per_extra_bed: 499 })
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.detail || 'Failed', variant: 'destructive' })
    }
  }

  const FEATURE_LABELS: Record<string, string> = {
    ai_triage: 'AI Triage', police_cases: 'Police Cases', opd: 'OPD Management',
    multi_dept_routing: 'Multi-Dept Routing', api_access: 'API Access',
    abdm: 'ABDM/ABHA', custom_branding: 'Custom Branding', advanced_analytics: 'Advanced Analytics',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage pricing tiers for the platform</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>Create Plan</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(plans || []).map((plan: any) => (
            <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
              {!plan.is_active && (
                <div className="absolute top-2 right-2 text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">Inactive</div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">&#8377;{plan.base_price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Users included</span>
                    <span className="font-medium">{plan.max_users === 0 ? 'Unlimited' : plan.included_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beds included</span>
                    <span className="font-medium">{plan.max_beds === 0 ? 'Unlimited' : plan.included_beds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departments</span>
                    <span className="font-medium">{plan.max_departments === 0 ? 'Unlimited' : plan.max_departments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra user</span>
                    <span className="font-medium">&#8377;{plan.price_per_extra_user}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra bed</span>
                    <span className="font-medium">&#8377;{plan.price_per_extra_bed}/mo</span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const enabled = plan.features?.[key]
                    return (
                      <div key={key} className="flex items-center gap-2 text-xs">
                        {enabled ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Plan Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => update('name', e.target.value)} /></div>
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => update('code', e.target.value.toLowerCase())} /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => update('description', e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Base Price</Label><Input type="number" value={form.base_price} onChange={(e) => update('base_price', +e.target.value)} /></div>
              <div><Label>Per Extra User</Label><Input type="number" value={form.price_per_extra_user} onChange={(e) => update('price_per_extra_user', +e.target.value)} /></div>
              <div><Label>Per Extra Bed</Label><Input type="number" value={form.price_per_extra_bed} onChange={(e) => update('price_per_extra_bed', +e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Max Users</Label><Input type="number" value={form.max_users} onChange={(e) => update('max_users', +e.target.value)} /></div>
              <div><Label>Max Beds</Label><Input type="number" value={form.max_beds} onChange={(e) => update('max_beds', +e.target.value)} /></div>
              <div><Label>Max Depts</Label><Input type="number" value={form.max_departments} onChange={(e) => update('max_departments', +e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createPlan.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
