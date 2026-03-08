import { useState } from 'react';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import tegaLogo from '@/assets/tega-logo.png';
import NotificationBell from '@/components/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { LogOut, LayoutDashboard, FileText, Users, Award, Settings, Shield, CheckSquare, GitBranch, Layers, Menu, X, Bell, DollarSign, MessageSquare, User, Activity, Trophy, Gavel } from 'lucide-react';

const navItems: Record<string, { label: string; href: string; icon: React.ElementType }[]> = {
  submitter: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Applications', href: '/submissions', icon: FileText },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  judge: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Submissions', href: '/judge/submissions', icon: FileText },
    { label: 'My Scores', href: '/judge/scores', icon: Award },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  secretariat: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Screening Queue', href: '/secretariat/screening', icon: Shield },
    { label: 'All Submissions', href: '/secretariat/submissions', icon: FileText },
    { label: 'Judge Assignments', href: '/secretariat/panels', icon: Layers },
    { label: 'Routing Engine', href: '/secretariat/routing', icon: GitBranch },
    { label: 'Judges', href: '/secretariat/judges', icon: Users },
    { label: 'Judge Work Rate', href: '/secretariat/judge-work-rate', icon: Activity },
    { label: 'Scores', href: '/secretariat/scores', icon: Award },
    { label: 'Rankings', href: '/secretariat/rankings', icon: Trophy },
    { label: 'Manage Users', href: '/secretariat/users', icon: Settings },
    { label: 'Statistics', href: '/secretariat/statistics', icon: CheckSquare },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  country_representative: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Screening Queue', href: '/secretariat/screening', icon: Shield },
    { label: 'All Submissions', href: '/secretariat/submissions', icon: FileText },
    { label: 'Panels', href: '/secretariat/panels', icon: Layers },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Submission Approvals', href: '/admin/approvals', icon: Shield },
    { label: 'Judge Applications', href: '/admin/judge-applications', icon: Gavel },
    { label: 'All Submissions', href: '/admin/submissions', icon: FileText },
    { label: 'Scores', href: '/admin/scores', icon: Award },
    { label: 'Rankings', href: '/admin/rankings', icon: Trophy },
    { label: 'Manage Users', href: '/secretariat/users', icon: Users },
    { label: 'Finance', href: '/admin/finance', icon: DollarSign },
    { label: 'Messaging', href: '/admin/messaging', icon: MessageSquare },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
  super_admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Submission Approvals', href: '/admin/approvals', icon: Shield },
    { label: 'Judge Applications', href: '/admin/judge-applications', icon: Gavel },
    { label: 'All Submissions', href: '/admin/submissions', icon: FileText },
    { label: 'Scores', href: '/admin/scores', icon: Award },
    { label: 'Rankings', href: '/admin/rankings', icon: Trophy },
    { label: 'Manage Users', href: '/secretariat/users', icon: Settings },
    { label: 'Finance', href: '/admin/finance', icon: DollarSign },
    { label: 'Messaging', href: '/admin/messaging', icon: MessageSquare },
    { label: 'Profile', href: '/profile', icon: User },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = role ? (navItems[role] || []) : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const roleLabelMap: Record<string, string> = {
    submitter: 'Applicant',
    judge: 'Judge',
    country_representative: 'Country Representative',
    secretariat: 'Secretariat',
    admin: 'Admin',
    super_admin: 'Super Admin',
  };
  const roleLabel = role ? (roleLabelMap[role] || role) : 'Applicant';
  const roleBadgeColor = role === 'secretariat' || role === 'country_representative'
    ? 'bg-destructive/20 text-destructive'
    : role === 'judge'
    ? 'bg-primary/20 text-primary'
    : role === 'admin' || role === 'super_admin'
    ? 'bg-accent/20 text-accent'
    : 'bg-success/20 text-success';

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 border-b border-border p-4">
        <img src={tegaLogo} alt="TEGA" className="h-10 w-auto max-w-[100px] object-contain" />
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground truncate">TEGA</h2>
          <p className="text-xs text-muted-foreground">Awards Portal</p>
        </div>
        {isMobile && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
            {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{profile?.full_name || 'User'}</p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
          <NotificationBell />
        </div>
        <Button variant="outline" size="sm" className="w-full gap-2 border-border" onClick={handleSignOut}>
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <img src={tegaLogo} alt="TEGA" className="h-8 w-auto object-contain" />
          </div>
          <NotificationBell />
        </header>
      )}

      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <aside className="fixed left-0 top-0 h-full w-72 bg-sidebar flex flex-col border-r border-border" onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {!isMobile && (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
          {sidebarContent}
        </aside>
      )}

      <main className={`flex-1 ${isMobile ? 'pt-16 p-4' : 'ml-64 p-8'}`}>
        {children}
      </main>
    </div>
  );
}
