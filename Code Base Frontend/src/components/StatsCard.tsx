import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  description?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}

export function StatsCard({ title, value, icon: Icon, description, trend, color }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4 text-muted-foreground', color)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' && <span className="text-green-600 text-xs">↑ Increasing</span>}
            {trend === 'down' && <span className="text-red-600 text-xs">↓ Decreasing</span>}
            {trend === 'neutral' && <span className="text-gray-600 text-xs">→ Stable</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
