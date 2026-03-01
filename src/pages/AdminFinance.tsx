import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { DollarSign, Clock, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminFinance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*, submissions!inner(school_name, nominator_name, nominator_email, submitter_id, category_id, school_country)')
        .order('created_at', { ascending: false });

      if (paymentsData) {
        setPayments(paymentsData);
        const submitterIds = [...new Set(paymentsData.map((p: any) => p.submissions?.submitter_id).filter(Boolean))];
        if (submitterIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email, phone, country').in('user_id', submitterIds);
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
  const totalFailed = failed.reduce((sum, p) => sum + Number(p.amount), 0);

  const statCards = [
    { label: 'Total Collected', value: `KES ${totalCollected.toLocaleString()}`, icon: CheckCircle, color: 'text-success', sub: `${completed.length} transactions` },
    { label: 'Pending Payments', value: `KES ${totalPending.toLocaleString()}`, icon: Clock, color: 'text-warning', sub: `${pending.length} awaiting` },
    { label: 'Failed / Abandoned', value: `KES ${totalFailed.toLocaleString()}`, icon: XCircle, color: 'text-destructive', sub: `${failed.length} transactions` },
    { label: 'Total Transactions', value: payments.length, icon: DollarSign, color: 'text-primary', sub: `All time` },
  ];

  const filterPayments = (data: any[]) => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(p => {
      const profile = profiles[p.submissions?.submitter_id];
      return (
        (profile?.full_name || '').toLowerCase().includes(q) ||
        (profile?.email || '').toLowerCase().includes(q) ||
        (p.submissions?.school_name || '').toLowerCase().includes(q) ||
        (p.transaction_reference || '').toLowerCase().includes(q)
      );
    });
  };

  const exportCSV = (data: any[]) => {
    const headers = ['Name', 'Email', 'Phone', 'School', 'Country', 'Amount', 'Currency', 'Status', 'Reference', 'Payment Method', 'Date', 'Paid At'];
    const rows = data.map(p => {
      const profile = profiles[p.submissions?.submitter_id];
      return [
        profile?.full_name || p.submissions?.nominator_name || '',
        profile?.email || p.submissions?.nominator_email || '',
        profile?.phone || '',
        p.submissions?.school_name || '',
        p.submissions?.school_country || profile?.country || '',
        Number(p.amount),
        p.currency,
        p.payment_status,
        p.transaction_reference || '',
        p.payment_method || '',
        new Date(p.created_at).toLocaleString(),
        p.paid_at ? new Date(p.paid_at).toLocaleString() : '',
      ].map(v => `"${v}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tega-finance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const renderTable = (data: any[]) => {
    const filtered = filterPayments(data);
    return (
      <Card className="glass-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Initiated</TableHead>
              <TableHead>Paid At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No records found</TableCell></TableRow>
            ) : filtered.map(p => {
              const profile = profiles[p.submissions?.submitter_id];
              return (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-medium">{profile?.full_name || p.submissions?.nominator_name || '—'}</TableCell>
                  <TableCell className="text-sm">{profile?.email || p.submissions?.nominator_email || '—'}</TableCell>
                  <TableCell className="text-sm">{profile?.phone || '—'}</TableCell>
                  <TableCell>{p.submissions?.school_name || '—'}</TableCell>
                  <TableCell className="text-sm">{p.submissions?.school_country || profile?.country || '—'}</TableCell>
                  <TableCell className="font-semibold">{p.currency} {Number(p.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 text-xs ${
                      p.payment_status === 'completed' ? 'bg-success/20 text-success' :
                      p.payment_status === 'pending' ? 'bg-warning/20 text-warning' :
                      'bg-destructive/20 text-destructive'
                    }`}>{p.payment_status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{p.transaction_reference || '—'}</TableCell>
                  <TableCell className="text-xs">{p.payment_method || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.paid_at ? new Date(p.paid_at).toLocaleString() : '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="font-display text-3xl font-bold">
            <span className="text-gradient-gold">Finance</span> Overview
          </h1>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCSV(payments)}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
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
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, school or reference..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary"
          />
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
