import { Globe, Moon, Sun, User, ChevronDown, Building2, Activity, Stethoscope, LogOut, UserCog, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useActiveAlerts } from '@/hooks/useAlerts';
import { useDepartments } from '@/hooks/useDepartments';
import { useBeds } from '@/hooks/useBeds';

interface DashboardHeaderProps {
  hospitalName?: string;
  departmentName?: string;
}

export function DashboardHeader({
  hospitalName = "Apollo Hospitals",
  departmentName = "Emergency Department – Unit A",
}: DashboardHeaderProps) {
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState('EN');
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const { data: alertsData } = useActiveAlerts();
  const unreadCount = alertsData?.data?.unreadCount || 0;
  const { data: departments } = useDepartments();
  const { data: bedsData } = useBeds();

  // Map department code to navigation path
  const deptCodeToPath: Record<string, string> = {
    ED: '/emergency/unit-a',
    ECU: '/emergency/care-unit',
    TC: '/emergency/trauma',
    ICU: '/emergency/icu',
    GW: '/emergency/general-ward',
    PED: '/emergency/pediatrics',
    OPD: '/opd/general',
    CARD: '/opd/cardiology',
  };

  // Emergency department codes vs OPD/Ward codes
  const emergencyCodes = new Set(['ED', 'ECU', 'TC', 'ICU']);
  const opdCodes = new Set(['OPD', 'CARD', 'GW', 'PED']);

  // Calculate bed counts per department from live data
  const allBeds: any[] = bedsData?.data || [];
  const bedCountsByDept = useMemo(() => {
    const counts: Record<string, { total: number; occupied: number }> = {};
    for (const bed of allBeds) {
      const dept = bed.department || 'Unknown';
      if (!counts[dept]) counts[dept] = { total: 0, occupied: 0 };
      counts[dept].total++;
      if (bed.status === 'occupied') counts[dept].occupied++;
    }
    return counts;
  }, [allBeds]);

  const emergencyDepts = departments?.filter(d => emergencyCodes.has(d.code)) || [];
  const opdDepts = departments?.filter(d => opdCodes.has(d.code)) || [];

  const userRole = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest';
  const userName = user?.name || 'Guest';

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const roleColors = {
    Doctor: 'bg-primary/10 text-primary',
    Nurse: 'bg-green-500/10 text-green-700',
    Admin: 'bg-purple-500/10 text-purple-700',
  };

  return (
    <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">+</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground leading-none">{hospitalName}</h1>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 hover:text-foreground transition-colors">
                  <Building2 className="w-3 h-3" />
                  {departmentName}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80 bg-popover border border-border shadow-lg z-50">
                <div>
                  <DropdownMenuLabel className="text-xs font-semibold text-foreground flex items-center gap-2 py-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Apollo Hospitals
                  </DropdownMenuLabel>

                  {emergencyDepts.length > 0 && (
                    <div className="pl-4">
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Emergency & Critical Care
                      </DropdownMenuLabel>
                      {emergencyDepts.map((dept) => {
                        const counts = bedCountsByDept[dept.name];
                        const occupied = counts?.occupied || 0;
                        const total = counts?.total || 0;
                        return (
                          <DropdownMenuItem
                            key={dept.id}
                            onClick={() => navigate(deptCodeToPath[dept.code] || '/emergency/unit-a')}
                            className="text-sm cursor-pointer flex items-center justify-between"
                          >
                            <span>{dept.name}</span>
                            <span className="text-[10px] text-muted-foreground">{occupied}/{total} beds</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  )}

                  {opdDepts.length > 0 && (
                    <div className="pl-4 mt-1">
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                        <Stethoscope className="w-3 h-3" />
                        Outpatient & Wards
                      </DropdownMenuLabel>
                      {opdDepts.map((dept) => {
                        const counts = bedCountsByDept[dept.name];
                        const occupied = counts?.occupied || 0;
                        const total = counts?.total || 0;
                        return (
                          <DropdownMenuItem
                            key={dept.id}
                            onClick={() => navigate(deptCodeToPath[dept.code] || '/opd/general')}
                            className="text-sm cursor-pointer flex items-center justify-between"
                          >
                            <span>{dept.name}</span>
                            <span className="text-[10px] text-muted-foreground">{occupied}/{total} beds</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  )}

                  {(!departments || departments.length === 0) && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Loading departments...</div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">System Online</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" />
              {language}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border border-border shadow-lg z-50">
            <DropdownMenuItem onClick={() => setLanguage('EN')}>English</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('HI')}>हिंदी</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('TE')}>తెలుగు</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="h-8 w-8 relative" onClick={() => navigate('/alerts')}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        <div className="h-6 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted/50 rounded-lg px-2 py-1.5 transition-colors">
              {user?.avatar ? (
                <img src={user.avatar} alt={userName} className="w-7 h-7 rounded-full object-cover bg-secondary" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
              <div className="text-right">
                <p className="text-xs font-medium leading-none">{userName}</p>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block", roleColors[userRole as keyof typeof roleColors] || 'bg-gray-100 text-gray-600')}>
                  {userRole}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
            {user ? (
              <>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Signed in as {userRole}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                    <UserCog className="w-4 h-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setUser(null);
                    navigate('/login');
                  }}
                  className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Not signed in
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate('/login')}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
