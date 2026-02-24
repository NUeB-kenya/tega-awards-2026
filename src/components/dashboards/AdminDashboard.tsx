import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, XCircle, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, total: 0 });

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('submissions').select('approval_status');
      if (data) {
        setStats({
          total: data.length,
          pending: data.filter(s => s.approval_status === 'pending').length,
          approved: data.filter(s => s.approval_status === 'approved').length,
          declined: data.filter(s => s.approval_status === 'declined').length,
        });
      }
    };
    fetch();
  }, []);

  const cards = [
    { label: 'Total Applications', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
    { label: 'Declined', value: stats.declined, icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">
          <span className="text-gradient-gold">Admin</span> Dashboard
        </h1>
        <p className="mt-1 text-muted-foreground">
          Welcome, {profile?.full_name} · Manage approvals & communications
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {cards.map(stat => {
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
