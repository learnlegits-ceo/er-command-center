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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useActiveAlerts } from '@/hooks/useAlerts';

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
                    Apollo Main Campus
                  </DropdownMenuLabel>

                  <div className="pl-4">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Emergency Departments
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/emergency/unit-a')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>Emergency Department – Unit A</span>
                      <span className="text-[10px] text-muted-foreground">8/12 beds</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/emergency/unit-b')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>Emergency Department – Unit B</span>
                      <span className="text-[10px] text-muted-foreground">6/10 beds</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/emergency/trauma')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>Trauma Center</span>
                      <span className="text-[10px] text-muted-foreground">5/8 beds</span>
                    </DropdownMenuItem>
                  </div>

                  <div className="pl-4 mt-1">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      Outpatient Departments
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/opd/general')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>General OPD</span>
                      <span className="text-[10px] text-muted-foreground">3/20 beds</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/opd/cardiology')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>Cardiology OPD</span>
                      <span className="text-[10px] text-muted-foreground">4/8 beds</span>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator />

                  <DropdownMenuLabel className="text-xs font-semibold text-foreground flex items-center gap-2 py-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    Apollo City Center
                  </DropdownMenuLabel>

                  <div className="pl-4">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      Emergency Departments
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/emergency/care-unit')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>Emergency Care Unit</span>
                      <span className="text-[10px] text-muted-foreground">3/6 beds</span>
                    </DropdownMenuItem>
                  </div>

                  <div className="pl-4 mt-1">
                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider py-1 flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />
                      Outpatient Departments
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigate('/opd/general')} className="text-sm cursor-pointer flex items-center justify-between">
                      <span>General OPD</span>
                      <span className="text-[10px] text-muted-foreground">3/20 beds</span>
                    </DropdownMenuItem>
                  </div>
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
