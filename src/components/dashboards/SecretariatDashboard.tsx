import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Star, Shield } from 'lucide-react';

export default function SecretariatDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ submissions: 0, judges: 0, scores: 0, submitters: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [subs, roles, scores] = await Promise.all([
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('role'),
        supabase.from('scores').select('id', { count: 'exact', head: true }),
      ]);
      const judgeCount = roles.data?.filter(r => r.role === 'judge').length || 0;
      const submitterCount = roles.data?.filter(r => r.role === 'submitter').length || 0;
      setStats({
        submissions: subs.count || 0,
        judges: judgeCount,
        scores: scores.count || 0,
        submitters: submitterCount,
      });
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Submissions', value: stats.submissions, icon: FileText, color: 'text-primary' },
    { label: 'Active Judges', value: stats.judges, icon: Users, color: 'text-success' },
    { label: 'Scores Given', value: stats.scores, icon: Star, color: 'text-warning' },
    { label: 'Submitters', value: stats.submitters, icon: Shield, color: 'text-accent' },
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
