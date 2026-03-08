import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Admin Approvals is now READ-ONLY for submissions (no approve/decline buttons)
// Admin only approves JUDGE applications at /admin/judge-applications

export default function AdminApprovals() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/20 text-warning',
    approved: 'bg-success/20 text-success',
    declined: 'bg-destructive/20 text-destructive',
    banned: 'bg-destructive/30 text-destructive',
  };

  const byApproval = (status: string) => submissions.filter(s => s.approval_status === status);

  const renderTable = (data: any[]) => (
    <Card className="glass-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>School</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Approval</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No submissions</TableCell></TableRow>
          ) : data.map(sub => (
            <TableRow key={sub.id} className="border-border">
              <TableCell className="font-medium">{sub.school_name}</TableCell>
              <TableCell>{sub.nominator_name}</TableCell>
              <TableCell>{sub.school_country}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {sub.award_categories?.map((c: string) => (
                    <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell><Badge className={`bg-muted text-muted-foreground border-0 text-xs`}>{sub.status}</Badge></TableCell>
              <TableCell><Badge className={`${statusColors[sub.approval_status] || ''} border-0 text-xs`}>{sub.approval_status}</Badge></TableCell>
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
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient-gold">Submissions</span> Overview
        </h1>
        <p className="mb-8 text-muted-foreground">View all application submissions. Screening & approval is managed by the Secretariat. To approve judges, go to Judge Applications.</p>

        <Tabs defaultValue="all">
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="all">All ({submissions.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({byApproval('pending').length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({byApproval('approved').length})</TabsTrigger>
            <TabsTrigger value="declined">Declined ({byApproval('declined').length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all">{renderTable(submissions)}</TabsContent>
          <TabsContent value="pending">{renderTable(byApproval('pending'))}</TabsContent>
          <TabsContent value="approved">{renderTable(byApproval('approved'))}</TabsContent>
          <TabsContent value="declined">{renderTable(byApproval('declined'))}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
