import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function AdminFinance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, submissions!inner(school_name, nominator_name, nominator_email, submitter_id)')
        .order('created_at', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData);
        const submitterIds = [...new Set(paymentsData.map((p: any) => p.submissions?.submitter_id).filter(Boolean))];
        if (submitterIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email').in('user_id', submitterIds);
          const profileMap: Record<string, any> = {};
          profilesData?.forEach(p => { profileMap[p.user_id] = p; });
          setProfiles(profileMap);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const completed = payments.filter(p => p.payment_status === 'completed');
  const pending = payments.filter(p => p.payment_status === 'pending');
  const failed = payments.filter(p => p.payment_status === 'failed');

  const totalCollected = completed.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pending.reduce((sum, p) => sum + Number(p.amount), 0);

  const statCards = [
    { label: 'Total Collected', value: `KES ${totalCollected.toLocaleString()}`, icon: CheckCircle, color: 'text-success' },
    { label: 'Pending Payments', value: `KES ${totalPending.toLocaleString()}`, icon: Clock, color: 'text-warning' },
    { label: 'Completed Transactions', value: completed.length, icon: DollarSign, color: 'text-primary' },
    { label: 'Failed / Abandoned', value: failed.length, icon: XCircle, color: 'text-destructive' },
  ];

  const renderTable = (data: any[]) => (
    <Card className="glass-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No records</TableCell></TableRow>
          ) : data.map(p => {
            const profile = profiles[p.submissions?.submitter_id];
            return (
              <TableRow key={p.id} className="border-border">
                <TableCell className="font-medium">{profile?.full_name || p.submissions?.nominator_name || '—'}</TableCell>
                <TableCell className="text-sm">{profile?.email || p.submissions?.nominator_email || '—'}</TableCell>
                <TableCell>{p.submissions?.school_name || '—'}</TableCell>
                <TableCell className="font-semibold">{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={`border-0 text-xs ${
                    p.payment_status === 'completed' ? 'bg-success/20 text-success' :
                    p.payment_status === 'pending' ? 'bg-warning/20 text-warning' :
                    'bg-destructive/20 text-destructive'
                  }`}>{p.payment_status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{p.transaction_reference || '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient-gold">Finance</span> Overview
        </h1>
        <p className="mb-8 text-muted-foreground">Track all payments, pending amounts, and transaction history</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map(stat => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="all">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderTable(payments)}</TabsContent>
          <TabsContent value="completed">{renderTable(completed)}</TabsContent>
          <TabsContent value="pending">{renderTable(pending)}</TabsContent>
          <TabsContent value="failed">{renderTable(failed)}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
