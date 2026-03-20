import { IndianRupee, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlatformBillingOverview, useGenerateInvoices } from '@/hooks/usePlatform'
import { useUser } from '@/contexts/UserContext'
import { Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export default function PlatformBilling() {
  const { isPlatformAdmin } = useUser()
  const { data, isLoading } = usePlatformBillingOverview()
  const generateInvoices = useGenerateInvoices()
  const { toast } = useToast()

  if (!isPlatformAdmin) return <Navigate to="/dashboard" replace />

  const handleGenerate = async () => {
    try {
      const res = await generateInvoices.mutateAsync()
      const result = res.data?.data
      toast({ title: `Generated ${result?.generated || 0} invoices. ${result?.skipped || 0} already existed.` })
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.detail || 'Failed', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const stats = [
    { label: 'Total Revenue', value: `₹${(data?.total_revenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-green-600 bg-green-50' },
    { label: 'Outstanding', value: `₹${(data?.outstanding_amount || 0).toLocaleString()}`, icon: AlertCircle, color: 'text-orange-600 bg-orange-50' },
    { label: 'Paid Invoices', value: data?.paid_invoices || 0, icon: CheckCircle, color: 'text-blue-600 bg-blue-50' },
    { label: 'Overdue', value: data?.overdue_invoices || 0, icon: FileText, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue and invoicing across all hospitals</p>
        </div>
        <Button onClick={handleGenerate} disabled={generateInvoices.isPending}>
          {generateInvoices.isPending ? 'Generating...' : 'Generate Monthly Invoices'}
        </Button>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            {data?.pending_invoices || 0} pending invoices awaiting payment.
            Use "Generate Monthly Invoices" to create invoices for the current billing period.
            Mark invoices as paid from individual hospital detail pages.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
