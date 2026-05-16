import { useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Bed,
  Bell,
  Shield,
  User,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Activity,
  Building2,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUser } from '@/contexts/UserContext'
import { useActiveAlerts } from '@/hooks/useAlerts'
import { cn } from '@/lib/utils'

type NavItem = {
  // i18n key — resolved at render time so language changes re-translate
  labelKey: string
  fallback: string
  // Either a fixed path, OR a function that returns the current path (for the dashboard which is dept-aware)
  path: string
  icon: typeof LayoutDashboard
  matcher?: (pathname: string) => boolean
  badgeCount?: number
  visibleFor?: ('nurse' | 'doctor' | 'admin' | 'platform_admin')[]
}

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { t } = useTranslation()
  const { data: alertsData } = useActiveAlerts()
  const unreadCount = alertsData?.data?.unreadCount || 0
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebarCollapsed') === '1'
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try { localStorage.setItem('sidebarCollapsed', next ? '1' : '0') } catch { /* no-op */ }
      return next
    })
  }

  const isPlatformAdmin = user?.role === 'platform_admin'

  // Platform admin gets a different nav
  const platformNav: NavItem[] = [
    { labelKey: 'nav.dashboard', fallback: 'Dashboard', path: '/platform', icon: LayoutDashboard, matcher: (p) => p === '/platform' },
    { labelKey: 'platform.hospitals', fallback: 'Hospitals', path: '/platform/hospitals', icon: Building2 },
    { labelKey: 'platform.plans', fallback: 'Plans', path: '/platform/plans', icon: Activity },
    { labelKey: 'platform.billing', fallback: 'Billing', path: '/platform/billing', icon: Activity },
    { labelKey: 'platform.team', fallback: 'Team', path: '/platform/team', icon: Users },
  ]

  // Regular nav for clinical / admin users
  const mainNav: NavItem[] = [
    {
      labelKey: 'nav.dashboard',
      fallback: 'Dashboard',
      path: '/emergency/unit-a',
      icon: LayoutDashboard,
      matcher: (p) => p.startsWith('/emergency') || p.startsWith('/opd') || p === '/dashboard',
    },
    { labelKey: 'nav.patients', fallback: 'Patients', path: '/patients', icon: Users },
    { labelKey: 'nav.beds', fallback: 'Beds', path: '/beds', icon: Bed },
    { labelKey: 'nav.alerts', fallback: 'Alerts', path: '/alerts', icon: Bell, badgeCount: unreadCount },
    { labelKey: 'nav.admin', fallback: 'Admin', path: '/admin', icon: Shield, visibleFor: ['admin'] },
  ]

  const accountNav: NavItem[] = [
    { labelKey: 'nav.profile', fallback: 'Profile', path: '/profile', icon: User },
    { labelKey: 'nav.settings', fallback: 'Settings', path: '/settings', icon: Settings },
    { labelKey: 'nav.help', fallback: 'Help', path: '/help', icon: HelpCircle },
  ]

  const navToRender = isPlatformAdmin ? platformNav : mainNav
  const isActive = (item: NavItem) => {
    if (item.matcher) return item.matcher(location.pathname)
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/')
  }

  const renderItem = (item: NavItem) => {
    if (item.visibleFor && (!user?.role || !item.visibleFor.includes(user.role as any))) {
      return null
    }
    const Icon = item.icon
    const active = isActive(item)
    // Resolve label via i18n with the hard-coded English fallback
    const label = t(item.labelKey, { defaultValue: item.fallback })
    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        title={collapsed ? label : undefined}
        className={cn(
          'group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="flex-1 text-left truncate">{label}</span>}
        {!collapsed && item.badgeCount && item.badgeCount > 0 ? (
          <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">
            {item.badgeCount > 99 ? '99+' : item.badgeCount}
          </span>
        ) : null}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        'border-r border-border bg-card flex flex-col transition-all duration-200 h-[calc(100vh-56px)] sticky top-14',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2 border-b border-border">
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title={collapsed ? t('sidebar.expand', { defaultValue: 'Expand sidebar' }) : t('sidebar.collapse', { defaultValue: 'Collapse sidebar' })}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navToRender.map(renderItem)}
      </nav>

      {/* Account nav */}
      {!isPlatformAdmin && (
        <div className="border-t border-border p-2 space-y-1">
          {accountNav.map(renderItem)}
        </div>
      )}

      {/* Quick-action footer */}
      {!collapsed && !isPlatformAdmin && (
        <div className="p-3 border-t border-border">
          <button
            onClick={() => navigate('/emergency/unit-a')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('sidebar.newArrival', { defaultValue: 'New Arrival' })}
          </button>
        </div>
      )}
    </aside>
  )
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────

const ROUTE_LABELS: Array<{ match: (p: string) => boolean; label: string }> = [
  { match: (p) => p === '/dashboard' || p.startsWith('/emergency') || p.startsWith('/opd'), label: 'Dashboard' },
  { match: (p) => p === '/patients', label: 'Patients' },
  { match: (p) => p === '/beds', label: 'Beds' },
  { match: (p) => p === '/alerts', label: 'Alerts & Notifications' },
  { match: (p) => p === '/profile', label: 'Profile' },
  { match: (p) => p === '/settings', label: 'Settings' },
  { match: (p) => p === '/help', label: 'Help & Support' },
  { match: (p) => p === '/admin', label: 'Admin Panel' },
  { match: (p) => p === '/platform', label: 'Platform Dashboard' },
  { match: (p) => p.startsWith('/platform/hospitals'), label: 'Hospitals' },
  { match: (p) => p === '/platform/plans', label: 'Plans' },
  { match: (p) => p === '/platform/billing', label: 'Billing' },
  { match: (p) => p === '/platform/team', label: 'Team' },
]

export function Breadcrumbs() {
  const location = useLocation()
  const navigate = useNavigate()
  const current = ROUTE_LABELS.find((r) => r.match(location.pathname))

  // No breadcrumb for the top-level dashboard itself
  if (!current || current.label === 'Dashboard') return null

  return (
    <nav className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
      <button
        onClick={() => navigate('/dashboard')}
        className="hover:text-foreground transition-colors"
      >
        Home
      </button>
      <span>/</span>
      <span className="text-foreground font-medium">{current.label}</span>
    </nav>
  )
}
