import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Ban } from 'lucide-react';

export default function AdminApprovals() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAll = async () => {
    const { data } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    // Sort: pending first, then approved, then declined/banned at bottom
    const sortOrder: Record<string, number> = { pending: 0, approved: 1, declined: 2, banned: 3 };
    const sorted = (data || []).sort((a: any, b: any) => (sortOrder[a.approval_status] ?? 1) - (sortOrder[b.approval_status] ?? 1));
    setSubmissions(sorted);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/20 text-warning',
    approved: 'bg-success/20 text-success',
    declined: 'bg-destructive/20 text-destructive',
    banned: 'bg-destructive/30 text-destructive',
  };

  const updateApproval = async (id: string, status: string, submitterId: string) => {
    const { error } = await supabase.from('submissions').update({ approval_status: status }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    // Send notification
    const titles: Record<string, string> = {
      approved: '🎉 Application Approved!',
      declined: 'Application Update',
      banned: 'Application Status',
    };
    const messages: Record<string, string> = {
      approved: 'Congratulations! Your TEGA Awards application has been approved. You are now moving to the next stage.',
      declined: 'After careful review, your application was not successful at this time. You may reapply in the next cycle.',
      banned: 'Your application has been flagged and suspended. Please contact support for more information.',
    };

    await supabase.from('notifications').insert({
      user_id: submitterId,
      title: titles[status] || 'Status Update',
      message: messages[status] || `Your application status was updated to: ${status}`,
      type: status === 'approved' ? 'success' : status === 'declined' ? 'warning' : 'error',
    });

    // Trigger email via edge function
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: { submissionId: id, status, userId: submitterId },
      });
    } catch (e) {
      // Email is best-effort
    }

    toast({ title: `Status updated to ${status}` });
    fetchAll();
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          <span className="text-gradient-gold">Approvals</span> Management
        </h1>
        <p className="mb-8 text-muted-foreground">Approve, decline, or review applications</p>

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
                <TableHead>Actions</TableHead>
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
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {sub.award_categories?.map((c: string) => (
                      <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell><Badge className={`${statusColors[sub.status] || 'bg-muted text-muted-foreground'} border-0`}>{sub.status}</Badge></TableCell>
                  <TableCell><Badge className={`${statusColors[sub.approval_status] || ''} border-0`}>{sub.approval_status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="text-success h-8 w-8 p-0" onClick={() => updateApproval(sub.id, 'approved', sub.submitter_id)} title="Approve">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => updateApproval(sub.id, 'declined', sub.submitter_id)} title="Decline">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive h-8 w-8 p-0" onClick={() => updateApproval(sub.id, 'banned', sub.submitter_id)} title="Ban">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
