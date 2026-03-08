import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  draft: 'bg-secondary text-muted-foreground',
  submitted: 'bg-primary/20 text-primary',
  paid: 'bg-success/20 text-success',
  screened: 'bg-success/30 text-success',
  assigned: 'bg-accent/20 text-accent',
  scored: 'bg-primary/30 text-primary',
  finalist: 'bg-warning/20 text-warning',
  winner: 'bg-success/40 text-success',
  disqualified: 'bg-destructive/20 text-destructive',
};

export default function SecretariatSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all');

  const fetchAll = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filterByStatus = (status: string | null) => {
    if (!status) return submissions;
    return submissions.filter(s => s.status === status);
  };

  const tabs = [
    { key: 'all', label: 'All', data: submissions },
    { key: 'submitted', label: 'Submitted', data: filterByStatus('submitted') },
    { key: 'screened', label: 'Screened', data: filterByStatus('screened') },
    { key: 'assigned', label: 'Assigned', data: filterByStatus('assigned') },
    { key: 'scored', label: 'Scored', data: filterByStatus('scored') },
    { key: 'finalist', label: 'Finalist', data: filterByStatus('finalist') },
    { key: 'winner', label: 'Winner', data: filterByStatus('winner') },
    { key: 'disqualified', label: 'Disqualified', data: filterByStatus('disqualified') },
  ];

  const renderTable = (data: any[]) => (
    <Card className="glass-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>School</TableHead>
            <TableHead>Nominator</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No submissions</TableCell></TableRow>
          ) : data.map(sub => (
            <TableRow key={sub.id} className="border-border">
              <TableCell className="font-medium">{sub.school_name}</TableCell>
              <TableCell>{sub.nominator_name}</TableCell>
              <TableCell>{sub.school_country}</TableCell>
              <TableCell><Badge variant="outline" className="text-xs border-border">{sub.stage || 'national'}</Badge></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {sub.award_categories?.map((c: string) => (
                    <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`border-0 text-xs ${
                  sub.approval_status === 'approved' ? 'bg-success/20 text-success' :
                  sub.approval_status === 'declined' ? 'bg-destructive/20 text-destructive' :
                  'bg-warning/20 text-warning'
                }`}>{sub.approval_status}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={`border-0 text-xs ${statusColors[sub.status] || 'bg-secondary text-muted-foreground'}`}>{sub.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">All <span className="text-gradient-gold">Submissions</span></h1>
        <p className="mb-8 text-muted-foreground">Full view of all TEGA nominations across all stages. Use tabs to filter by status.</p>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1 mb-4">
            {tabs.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">
                {t.label} ({t.data.length})
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map(t => (
            <TabsContent key={t.key} value={t.key}>
              {renderTable(t.data)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
