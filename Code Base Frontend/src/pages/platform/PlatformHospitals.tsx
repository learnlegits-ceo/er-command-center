import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search, MoreHorizontal } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useHospitals, useUpdateHospitalStatus } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'

export default function PlatformHospitals() {
  const { isPlatformAdmin } = useUser()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data: hospitals, isLoading } = useHospitals({ search: search || undefined })
  const updateStatus = useUpdateHospitalStatus()

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  const statusColors: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-gray-50 text-gray-700',
    suspended: 'bg-red-50 text-red-700',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hospitals</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all hospitals on the platform</p>
        </div>
        <Button onClick={() => navigate('/platform/hospitals/new')} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Hospital
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search hospitals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 text-xs font-medium text-muted-foreground">Hospital</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Code</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Users</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Beds</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="p-3 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(hospitals || []).map((h: any) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/platform/hospitals/${h.id}`)}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{h.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{h.code}</td>
                    <td className="p-3 text-sm">{h.plan_name || '-'}</td>
                    <td className="p-3 text-sm">{h.user_count}</td>
                    <td className="p-3 text-sm">{h.bed_count}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[h.subscription_status] || ''}`}>
                        {h.subscription_status}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/platform/hospitals/${h.id}`)}>View Details</DropdownMenuItem>
                          {h.subscription_status === 'active' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: h.id, status: 'suspended' })} className="text-red-600">
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {h.subscription_status === 'suspended' && (
                            <DropdownMenuItem onClick={() => updateStatus.mutate({ id: h.id, status: 'active' })} className="text-green-600">
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {(!hospitals || hospitals.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                      No hospitals found. Click "Add Hospital" to onboard one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
