import { useAuth, AppRole } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import tegaLogo from '@/assets/tega-logo.png';
import NotificationBell from '@/components/NotificationBell';
import { LogOut, LayoutDashboard, FileText, Users, Award, Settings, Shield, CheckSquare } from 'lucide-react';

const navItems: Record<AppRole, { label: string; href: string; icon: React.ElementType }[]> = {
  submitter: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Submissions', href: '/submissions', icon: FileText },
    { label: 'New Submission', href: '/submissions/new', icon: Award },
  ],
  judge: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Submissions', href: '/judge/submissions', icon: FileText },
    { label: 'My Scores', href: '/judge/scores', icon: Award },
  ],
  secretariat: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'All Submissions', href: '/secretariat/submissions', icon: FileText },
    { label: 'Judges', href: '/secretariat/judges', icon: Users },
    { label: 'Scores', href: '/secretariat/scores', icon: Award },
    { label: 'Manage Users', href: '/secretariat/users', icon: Settings },
    { label: 'Statistics', href: '/secretariat/statistics', icon: CheckSquare },
  ],
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Approvals', href: '/admin/approvals', icon: Shield },
    { label: 'All Submissions', href: '/admin/submissions', icon: FileText },
    { label: 'Messaging', href: '/admin/messaging', icon: Users },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = role ? navItems[role] : [];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const roleLabel = role === 'secretariat' ? 'Secretariat' : role === 'judge' ? 'Judge' : role === 'admin' ? 'Admin' : 'Applicant';
  const roleBadgeColor = role === 'secretariat' ? 'bg-destructive/20 text-destructive' : role === 'judge' ? 'bg-primary/20 text-primary' : role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-success/20 text-success';

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <img src={tegaLogo} alt="TEGA" className="h-10 w-10" />
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">TEGA</h2>
            <p className="text-xs text-muted-foreground">Awards Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 overflow-hidden">
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
      </aside>

      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
