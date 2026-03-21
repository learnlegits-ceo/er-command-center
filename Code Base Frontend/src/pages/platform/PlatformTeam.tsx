import { useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { usePlatformTeam, useInviteTeamMember, useRemoveTeamMember } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'

export default function PlatformTeam() {
  const { isPlatformAdmin, user } = useUser()
  const { data: team, isLoading } = usePlatformTeam()
  const inviteMember = useInviteTeamMember()
  const removeMember = useRemoveTeamMember()
  const [showInvite, setShowInvite] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  const handleInvite = async () => {
    try {
      await inviteMember.mutateAsync(form)
      alert('Team member invited!')
      setShowInvite(false)
      setForm({ name: '', email: '', password: '' })
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this team member?')) return
    try {
      await removeMember.mutateAsync(id)
      alert('Team member removed')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform administrator accounts</p>
        </div>
        <Button onClick={() => setShowInvite(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-3">
          {(team || []).map((member: any) => (
            <Card key={member.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <span className="text-amber-700 font-semibold text-sm">
                      {member.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    member.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {member.status}
                  </span>
                  {member.id !== user?.id && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700" onClick={() => handleRemove(member.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!team || team.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No team members found</p>
          )}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteMember.isPending || !form.name || !form.email || !form.password}>
              {inviteMember.isPending ? 'Inviting...' : 'Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
