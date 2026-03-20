import { Building2, Users, BedDouble, IndianRupee, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePlatformDashboard } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'

export default function PlatformDashboard() {
  const { isPlatformAdmin } = useUser()
  const { data, isLoading } = usePlatformDashboard()

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Hospitals', value: data?.total_hospitals || 0, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Users', value: data?.total_users || 0, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Total Beds', value: data?.total_beds || 0, icon: BedDouble, color: 'text-purple-600 bg-purple-50' },
    { label: 'Occupied Beds', value: data?.occupied_beds || 0, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of all hospitals on the platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hospitals by Plan */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Hospitals by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.hospitals_by_plan || []).map((item: any) => (
                <div key={item.plan} className="flex items-center justify-between">
                  <span className="text-sm">{item.plan}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, (item.count / Math.max(1, data?.total_hospitals || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
              {(!data?.hospitals_by_plan || data.hospitals_by_plan.length === 0) && (
                <p className="text-sm text-muted-foreground">No hospitals onboarded yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(data?.recent_signups || []).slice(0, 5).map((hospital: any) => (
                <div key={hospital.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{hospital.name}</p>
                    <p className="text-xs text-muted-foreground">{hospital.code}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    hospital.subscription_status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>
                    {hospital.subscription_status}
                  </span>
                </div>
              ))}
              {(!data?.recent_signups || data.recent_signups.length === 0) && (
                <p className="text-sm text-muted-foreground">No hospitals yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
