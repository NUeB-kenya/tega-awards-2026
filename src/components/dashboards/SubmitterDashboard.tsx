import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SubmitterDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, submitted: 0, scored: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('status')
        .eq('submitter_id', user.id);
      if (data) {
        setStats({
          total: data.length,
          submitted: data.filter(s => s.status === 'submitted').length,
          scored: data.filter(s => s.status === 'scored' || s.status === 'shortlisted').length,
        });
      }
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Total Submissions', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Under Review', value: stats.submitted, icon: Clock, color: 'text-warning' },
    { label: 'Scored', value: stats.scored, icon: CheckCircle, color: 'text-success' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome, <span className="text-gradient-gold">{profile?.full_name}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your TEGA award nominations</p>
        </div>
        <Link to="/submissions/new">
          <Button className="bg-gradient-gold gap-2 font-semibold">
            <Award className="h-4 w-4" />
            New Submission
          </Button>
        </Link>
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
