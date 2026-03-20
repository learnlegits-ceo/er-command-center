import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, Building2, Users, BedDouble, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useHospital } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'

export default function HospitalDetail() {
  const { isPlatformAdmin } = useUser()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: hospital, isLoading } = useHospital(id || '')

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!hospital) {
    return <div className="p-6 text-center text-muted-foreground">Hospital not found</div>
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-gray-50 text-gray-700',
    suspended: 'bg-red-50 text-red-700',
  }

  const stats = [
    { label: 'Users', value: hospital.user_count || 0, icon: Users, max: hospital.plan?.max_users },
    { label: 'Beds', value: hospital.bed_count || 0, icon: BedDouble, max: hospital.plan?.max_beds },
    { label: 'Departments', value: hospital.department_count || 0, icon: LayoutGrid, max: hospital.plan?.max_departments },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platform/hospitals')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{hospital.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[hospital.subscription_status] || ''}`}>
              {hospital.subscription_status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{hospital.code}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold mt-1">
                    {stat.value}
                    {stat.max && stat.max > 0 && <span className="text-sm font-normal text-muted-foreground"> / {stat.max}</span>}
                    {stat.max === 0 && <span className="text-sm font-normal text-muted-foreground"> / unlimited</span>}
                  </p>
                </div>
                <stat.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              {stat.max && stat.max > 0 && (
                <div className="mt-2 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospital Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Hospital Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hospital.address && <div><span className="text-muted-foreground">Address:</span> {hospital.address}</div>}
            {hospital.phone && <div><span className="text-muted-foreground">Phone:</span> {hospital.phone}</div>}
            {hospital.email && <div><span className="text-muted-foreground">Email:</span> {hospital.email}</div>}
            {hospital.domain && <div><span className="text-muted-foreground">Domain:</span> {hospital.domain}</div>}
            <div><span className="text-muted-foreground">Created:</span> {hospital.created_at ? new Date(hospital.created_at).toLocaleDateString() : '-'}</div>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {hospital.plan ? (
              <>
                <div className="text-lg font-bold">{hospital.plan.name}</div>
                <div><span className="text-muted-foreground">Base Price:</span> &#8377;{hospital.plan.base_price.toLocaleString()}/month</div>
                <div><span className="text-muted-foreground">Max Users:</span> {hospital.plan.max_users === 0 ? 'Unlimited' : hospital.plan.max_users}</div>
                <div><span className="text-muted-foreground">Max Beds:</span> {hospital.plan.max_beds === 0 ? 'Unlimited' : hospital.plan.max_beds}</div>
                {hospital.subscription_starts_at && (
                  <div><span className="text-muted-foreground">Since:</span> {new Date(hospital.subscription_starts_at).toLocaleDateString()}</div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No plan assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
