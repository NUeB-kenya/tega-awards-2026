import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, Star } from 'lucide-react';

export default function JudgeDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ totalSubmissions: 0, scored: 0, pending: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data: submissions } = await supabase.from('submissions').select('id');
      const { data: scores } = await supabase.from('scores').select('id').eq('judge_id', user.id);
      const total = submissions?.length || 0;
      const scoredCount = scores?.length || 0;
      setStats({ totalSubmissions: total, scored: scoredCount, pending: total - scoredCount });
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Total Submissions', value: stats.totalSubmissions, icon: FileText, color: 'text-primary' },
    { label: 'Scored', value: stats.scored, icon: CheckCircle, color: 'text-success' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-warning' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">
          Welcome, <span className="text-gradient-gold">{profile?.full_name}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Review and score TEGA award submissions</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
