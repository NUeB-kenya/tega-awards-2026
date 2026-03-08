import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Star, Shield, GitBranch, Layers, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecretariatDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    submissions: 0, judges: 0, scores: 0, applicants: 0,
    screening: 0, screened: 0, assigned: 0, panels: 0,
    national: 0, continental: 0, regional: 0, global: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      const [subs, roles, scores, panelsRes] = await Promise.all([
        supabase.from('submissions').select('id, status, stage'),
        supabase.from('user_roles').select('role'),
        supabase.from('scores').select('id', { count: 'exact', head: true }),
        supabase.from('panels').select('id', { count: 'exact', head: true }),
      ]);
      const allSubs = subs.data || [];
      const judgeCount = roles.data?.filter(r => r.role === 'judge').length || 0;
      const applicantCount = roles.data?.filter(r => r.role === 'submitter').length || 0;
      setStats({
        submissions: allSubs.length,
        judges: judgeCount,
        scores: scores.count || 0,
        applicants: applicantCount,
        screening: allSubs.filter(s => s.status === 'submitted' || s.status === 'paid').length,
        screened: allSubs.filter(s => s.status === 'screened').length,
        assigned: allSubs.filter(s => s.status === 'assigned').length,
        panels: panelsRes.count || 0,
        national: allSubs.filter(s => (s.stage || 'national') === 'national').length,
        continental: allSubs.filter(s => s.stage === 'continental').length,
        regional: allSubs.filter(s => s.stage === 'regional').length,
        global: allSubs.filter(s => s.stage === 'global').length,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Submissions', value: stats.submissions, icon: FileText, color: 'text-primary', href: '/secretariat/submissions' },
    { label: 'Screening Queue', value: stats.screening, icon: Shield, color: 'text-warning', href: '/secretariat/screening' },
    { label: 'Screened (Ready)', value: stats.screened, icon: CheckCircle, color: 'text-success', href: '/secretariat/screening' },
    { label: 'Assigned to Judges', value: stats.assigned, icon: Layers, color: 'text-accent', href: '/secretariat/panels' },
    { label: 'Active Judges', value: stats.judges, icon: Users, color: 'text-success', href: '/secretariat/judges' },
    { label: 'Scores Given', value: stats.scores, icon: Star, color: 'text-warning', href: '/secretariat/scores' },
    { label: 'Judge Groups', value: stats.panels, icon: Layers, color: 'text-primary', href: '/secretariat/panels' },
    { label: 'Applicants', value: stats.applicants, icon: FileText, color: 'text-muted-foreground', href: '/secretariat/users' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-gold">Secretariat</span> Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor all TEGA award activities — Welcome, {profile?.full_name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} to={stat.href}>
              <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Routing overview */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">3-Tier Pipeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.national}</p>
              <p className="text-xs text-muted-foreground">National</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 bg-accent/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-accent">{stats.continental}</p>
              <p className="text-xs text-muted-foreground">Continental</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 bg-warning/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-warning">{stats.regional}</p>
              <p className="text-xs text-muted-foreground">Regional</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 bg-success/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.global}</p>
              <p className="text-xs text-muted-foreground">Global</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
