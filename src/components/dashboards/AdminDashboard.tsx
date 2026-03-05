import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, XCircle, Shield, Users, Award, Gavel } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });
  const [judgeStats, setJudgeStats] = useState({ totalJudges: 0, pendingJudgeApps: 0, approvedJudgeApps: 0, rejectedJudgeApps: 0 });
  const [userStats, setUserStats] = useState({ totalUsers: 0, applicants: 0, judges: 0, secretariat: 0, admins: 0, representatives: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      const [subsRes, rolesRes, judgeAppsRes] = await Promise.all([
        supabase.from('submissions').select('approval_status'),
        supabase.from('user_roles').select('role'),
        supabase.from('judge_applications' as any).select('status'),
      ]);

      const subs = subsRes.data || [];
      setStats({
        total: subs.length,
        pending: subs.filter((s: any) => s.approval_status === 'pending').length,
        approved: subs.filter((s: any) => s.approval_status === 'approved').length,
        declined: subs.filter((s: any) => s.approval_status === 'declined').length,
      });

      const roles = rolesRes.data || [];
      setUserStats({
        totalUsers: roles.length,
        applicants: roles.filter((r: any) => r.role === 'submitter').length,
        judges: roles.filter((r: any) => r.role === 'judge').length,
        secretariat: roles.filter((r: any) => r.role === 'secretariat').length,
        admins: roles.filter((r: any) => r.role === 'admin' || r.role === 'super_admin').length,
        representatives: roles.filter((r: any) => r.role === 'country_representative').length,
      });

      const judgeApps = (judgeAppsRes.data || []) as any[];
      setJudgeStats({
        totalJudges: roles.filter((r: any) => r.role === 'judge').length,
        pendingJudgeApps: judgeApps.filter((a: any) => a.status === 'pending').length,
        approvedJudgeApps: judgeApps.filter((a: any) => a.status === 'approved').length,
        rejectedJudgeApps: judgeApps.filter((a: any) => a.status === 'rejected').length,
      });
    };
    fetchAll();
  }, []);

  const submissionCards = [
    { label: 'Total Applications', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Declined', value: stats.declined, icon: XCircle, color: 'text-destructive' },
  ];

  const userCards = [
    { label: 'Total Users', value: userStats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Applicants', value: userStats.applicants, icon: FileText, color: 'text-success' },
    { label: 'Active Judges', value: userStats.judges, icon: Gavel, color: 'text-primary' },
    { label: 'Country Representatives', value: userStats.representatives, icon: Shield, color: 'text-accent' },
  ];

  const judgeCards = [
    { label: 'Pending Judge Applications', value: judgeStats.pendingJudgeApps, icon: Clock, color: 'text-warning' },
    { label: 'Approved Judge Applications', value: judgeStats.approvedJudgeApps, icon: CheckCircle, color: 'text-success' },
    { label: 'Rejected Applications', value: judgeStats.rejectedJudgeApps, icon: XCircle, color: 'text-destructive' },
    { label: 'Secretariat + Admins', value: userStats.secretariat + userStats.admins, icon: Shield, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-gold">Admin</span> Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome, {profile?.full_name} · Full system overview
        </p>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Submissions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {submissionCards.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Users Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userCards.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Judge Applications</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {judgeCards.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
