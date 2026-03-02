import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const STATUSES = ['draft', 'submitted', 'paid', 'screened', 'assigned', 'scored', 'finalist', 'winner', 'disqualified'];
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

  const fetchAll = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('submissions').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `Status updated to ${status}` });
      fetchAll();
    }
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">All <span className="text-gradient-gold">Submissions</span></h1>
        <p className="mb-8 text-muted-foreground">Full view of all TEGA nominations across all stages</p>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>School</TableHead>
                <TableHead>Nominator</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : submissions.map(sub => (
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
                    <Select value={sub.status} onValueChange={v => updateStatus(sub.id, v)}>
                      <SelectTrigger className={`w-[140px] h-8 text-xs border-0 ${statusColors[sub.status] || ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
