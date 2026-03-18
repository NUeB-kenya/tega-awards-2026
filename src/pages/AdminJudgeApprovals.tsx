import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Eye, Gavel, Clock, FileText } from 'lucide-react';

export default function AdminJudgeApprovals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<any>(null);
  const [actionApp, setActionApp] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const fetchApps = async () => {
    const { data } = await supabase
      .from('judge_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data || []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const handleAction = async () => {
    if (!actionApp || !actionType || !user) return;
    const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

    await supabase.from('judge_applications').update({
      status: newStatus,
      review_notes: notes,
      reviewed_by: user.id,
    }).eq('id', actionApp.id);

    // If approved, update user role to judge
    if (actionType === 'approve') {
      await supabase.from('user_roles').update({ role: 'judge' }).eq('user_id', actionApp.user_id);
      await supabase.from('notifications').insert({
        user_id: actionApp.user_id,
        title: '✅ Judge Application Approved!',
        message: 'Congratulations! Your application to become a TEGA Awards Judge has been approved. You can now access the judging dashboard.',
        type: 'success',
        link: '/dashboard',
      });
    } else {
      await supabase.from('notifications').insert({
        user_id: actionApp.user_id,
        title: 'Judge Application Update',
        message: `Your judge application was not approved. ${notes ? `Reason: ${notes}` : 'Please contact support for more details.'}`,
        type: 'warning',
      });
    }

    toast({ title: `Application ${newStatus}` });
    setActionApp(null); setActionType(null); setNotes('');
    fetchApps();
  };

  const getSignedUrl = async (path: string) => {
    if (!path || docUrls[path]) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) setDocUrls(prev => ({ ...prev, [path]: data.signedUrl }));
  };

  const pending = apps.filter(a => a.status === 'pending');
  const approved = apps.filter(a => a.status === 'approved');
  const rejected = apps.filter(a => a.status === 'rejected');

  const statusBadge = (s: string) => {
    if (s === 'pending') return <Badge className="bg-warning/20 text-warning border-0 text-xs">Pending</Badge>;
    if (s === 'approved') return <Badge className="bg-success/20 text-success border-0 text-xs">Approved</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Rejected</Badge>;
  };

  const renderTable = (items: any[], showActions: boolean) => (
    <Card className="glass-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Categories</TableHead>
            <TableHead>COI</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">None</TableCell></TableRow>
          ) : items.map(app => (
            <TableRow key={app.id} className="border-border">
              <TableCell className="font-medium">{app.full_name}</TableCell>
              <TableCell><Badge variant="outline" className="border-border text-xs">{app.application_type}</Badge></TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(app.expertise_categories || []).slice(0, 2).map((c: string) => (
                    <Badge key={c} variant="outline" className="text-[10px] border-border">{c.split(' ').slice(0, 3).join(' ')}…</Badge>
                  ))}
                  {(app.expertise_categories || []).length > 2 && (
                    <Badge variant="outline" className="text-[10px] border-border">+{app.expertise_categories.length - 2}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{app.has_coi ? <Badge className="bg-warning/20 text-warning border-0 text-xs">Yes</Badge> : 'No'}</TableCell>
              <TableCell>{statusBadge(app.status)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setViewing(app); if (app.cv_path) getSignedUrl(app.cv_path); if (app.coi_document_path) getSignedUrl(app.coi_document_path); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {showActions && (
                    <>
                      <Button size="sm" variant="outline" className="text-success border-success/30 gap-1" onClick={() => { setActionApp(app); setActionType('approve'); }}>
                        <CheckCircle className="h-3 w-3" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 gap-1" onClick={() => { setActionApp(app); setActionType('reject'); }}>
                        <XCircle className="h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Gavel className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold">Judge <span className="text-gradient-gold">Applications</span></h1>
        </div>
        <p className="mb-8 text-muted-foreground">Review and approve judge & country representative applications</p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending', value: pending.length, icon: Clock, color: 'text-warning' },
            { label: 'Approved', value: approved.length, icon: CheckCircle, color: 'text-success' },
            { label: 'Rejected', value: rejected.length, icon: XCircle, color: 'text-destructive' },
          ].map(c => (
            <Card key={c.label} className="glass-card">
              <CardContent className="pt-6 flex items-center gap-3 justify-center">
                <c.icon className={`h-6 w-6 ${c.color}`} />
                <div>
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-secondary">
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pending">{renderTable(pending, true)}</TabsContent>
          <TabsContent value="approved">{renderTable(approved, false)}</TabsContent>
          <TabsContent value="rejected">{renderTable(rejected, false)}</TabsContent>
        </Tabs>

        {/* View Details */}
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Judge Application Details</DialogTitle></DialogHeader>
            {viewing && (
              <div className="space-y-4 text-sm max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs block">Name</span><span className="font-semibold">{viewing.full_name}</span></div>
                  <div><span className="text-muted-foreground text-xs block">Type</span>{viewing.application_type}</div>
                  <div><span className="text-muted-foreground text-xs block">Organization</span>{viewing.current_organization || 'N/A'}</div>
                  <div><span className="text-muted-foreground text-xs block">Position</span>{viewing.current_position || 'N/A'}</div>
                  <div><span className="text-muted-foreground text-xs block">Highest Education</span>{viewing.highest_education || 'N/A'}</div>
                  <div><span className="text-muted-foreground text-xs block">Years in Education</span>{viewing.years_in_education || 'N/A'}</div>
                </div>
                <div><span className="text-muted-foreground text-xs block">Why Judge</span><p>{viewing.why_judge || 'N/A'}</p></div>
                <div><span className="text-muted-foreground text-xs block">Areas of Expertise</span><p>{viewing.areas_of_expertise || 'N/A'}</p></div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Selected Categories ({(viewing.expertise_categories || []).length})</span>
                  <div className="flex flex-wrap gap-1">
                    {(viewing.expertise_categories || []).map((c: string) => (
                      <Badge key={c} variant="outline" className="text-xs border-border">{c}</Badge>
                    ))}
                  </div>
                </div>
                {viewing.has_coi && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <span className="text-warning text-xs font-semibold block">⚠️ Conflict of Interest Declared</span>
                    <p className="mt-1">{viewing.coi_description || 'No details provided'}</p>
                    {viewing.coi_document_path && docUrls[viewing.coi_document_path] && (
                      <a href={docUrls[viewing.coi_document_path]} target="_blank" rel="noreferrer" className="text-primary underline text-xs mt-1 inline-block">View COI Document</a>
                    )}
                  </div>
                )}
                {viewing.cv_path && docUrls[viewing.cv_path] && (
                  <a href={docUrls[viewing.cv_path]} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                    <FileText className="h-4 w-4" /> View CV/Resume
                  </a>
                )}
                {viewing.review_notes && (
                  <div><span className="text-muted-foreground text-xs block">Review Notes</span><p>{viewing.review_notes}</p></div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setActionApp(null); }}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">
                {actionType === 'approve' ? 'Approve Judge' : 'Reject Application'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {actionType === 'approve'
                  ? `Approve ${actionApp?.full_name} as a judge? They will gain access to the judging dashboard.`
                  : `Reject ${actionApp?.full_name}'s application?`}
              </p>
              <div>
                <Label>{actionType === 'reject' ? 'Rejection reason' : 'Notes (optional)'}</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 bg-secondary" placeholder="Optional notes..." />
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleAction}>
                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
