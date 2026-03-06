import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, MessageSquare, Eye, FileText, Shield, Info, X } from 'lucide-react';

type Submission = any;

export default function SecretariatScreening() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [panels, setPanels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'request_changes' | 'assign' | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedPanel, setSelectedPanel] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewDocs, setViewDocs] = useState<any[] | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [showGuide, setShowGuide] = useState(false);

  // Show screening guide 30s after opening
  useEffect(() => {
    const timer = setTimeout(() => setShowGuide(true), 30000);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    const [subsRes, panelsRes] = await Promise.all([
      supabase.from('submissions').select('*').in('status', ['submitted', 'paid']).order('created_at', { ascending: true }),
      supabase.from('panels').select('*'),
    ]);
    const subs = subsRes.data || [];
    setSubmissions(subs);
    setPanels(panelsRes.data || []);

    // Fetch profiles for all submitters
    const submitterIds = [...new Set(subs.map((s: any) => s.submitter_id).filter(Boolean))];
    if (submitterIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('user_id, full_name, email, phone, country').in('user_id', submitterIds);
      const pMap: Record<string, any> = {};
      profilesData?.forEach(p => { pMap[p.user_id] = p; });
      setProfiles(pMap);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async () => {
    if (!actionId || !actionType || !user) return;

    if (actionType === 'approve') {
      await supabase.from('submissions').update({
        approval_status: 'approved',
        status: 'screened',
        screening_notes: notes || 'Approved after screening',
        screened_by: user.id,
        screened_at: new Date().toISOString(),
      }).eq('id', actionId);

      const sub = submissions.find(s => s.id === actionId);
      if (sub) {
        await supabase.from('notifications').insert({
          user_id: sub.submitter_id,
          title: 'Application Approved',
          message: 'Your TEGA Awards application has passed screening and is now in the judging queue.',
          type: 'success',
          link: '/submissions',
        });
      }

      await supabase.rpc('log_audit' as any, {
        _user_id: user.id, _action_type: 'screening_approved', _entity_type: 'submission', _entity_id: actionId, _metadata: { notes },
      });
      toast({ title: 'Submission approved and moved to judging queue' });
    } else if (actionType === 'reject') {
      if (!notes.trim()) { toast({ title: 'Rejection reason required', variant: 'destructive' }); return; }
      await supabase.from('submissions').update({
        approval_status: 'declined', status: 'disqualified', screening_notes: notes, screened_by: user.id, screened_at: new Date().toISOString(),
      }).eq('id', actionId);

      const sub = submissions.find(s => s.id === actionId);
      if (sub) {
        await supabase.from('notifications').insert({
          user_id: sub.submitter_id, title: 'Application Not Approved', message: `Your application was not approved. Reason: ${notes}`, type: 'error', link: '/submissions',
        });
      }
      await supabase.rpc('log_audit' as any, { _user_id: user.id, _action_type: 'screening_rejected', _entity_type: 'submission', _entity_id: actionId, _metadata: { reason: notes } });
      toast({ title: 'Submission rejected' });
    } else if (actionType === 'request_changes') {
      if (!notes.trim()) { toast({ title: 'Please describe what changes are needed', variant: 'destructive' }); return; }
      // Unlock the submission for the applicant to fix
      await supabase.from('submissions').update({
        status: 'draft', is_locked: false, screening_notes: notes, screened_by: user.id,
      }).eq('id', actionId);

      const sub = submissions.find(s => s.id === actionId);
      if (sub) {
        await supabase.from('notifications').insert({
          user_id: sub.submitter_id, title: '📝 Changes Requested — Action Required',
          message: `Your TEGA application needs updates before it can proceed:\n\n${notes}\n\nPlease log in and update your application before the deadline.`,
          type: 'warning', link: '/submissions/new',
        });
      }
      toast({ title: 'Changes requested — applicant notified and submission unlocked' });
    } else if (actionType === 'assign') {
      if (!selectedPanel) { toast({ title: 'Select a panel', variant: 'destructive' }); return; }
      await supabase.from('submissions').update({ status: 'assigned', approval_status: 'approved' }).eq('id', actionId);
      const { data: panelJudges } = await supabase.from('panel_judges').select('judge_id').eq('panel_id', selectedPanel);
      if (panelJudges?.length) {
        const assignments = panelJudges.map(pj => ({ judge_id: pj.judge_id, submission_id: actionId!, status: 'pending' }));
        await supabase.from('judge_assignments').insert(assignments);
      }
      await supabase.rpc('log_audit' as any, { _user_id: user.id, _action_type: 'submission_assigned_to_panel', _entity_type: 'submission', _entity_id: actionId, _metadata: { panel_id: selectedPanel } });
      toast({ title: 'Submission assigned to panel' });
    }

    setActionId(null); setActionType(null); setNotes(''); setSelectedPanel('');
    fetchData();
  };

  const openAction = (id: string, type: typeof actionType) => { setActionId(id); setActionType(type); setNotes(''); };

  const viewDocuments = async (subId: string) => {
    const { data } = await supabase.from('submission_documents').select('*').eq('submission_id', subId);
    setViewDocs(data || []);
  };

  const getSignedUrl = async (filePath: string) => {
    if (docUrls[filePath]) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) setDocUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
  };

  const viewingSub = submissions.find(s => s.id === viewingId);
  const viewingProfile = viewingSub ? profiles[viewingSub.submitter_id] : null;

  const statusColor = (status: string) => {
    const map: Record<string, string> = { submitted: 'bg-primary/20 text-primary', paid: 'bg-success/20 text-success', screened: 'bg-success/30 text-success', assigned: 'bg-accent/20 text-accent' };
    return map[status] || 'bg-secondary text-muted-foreground';
  };

  const [checklist, setChecklist] = useState({ complete: false, categoryCorrect: false, evidenceOk: false, noDuplicate: false, refsValid: false });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold">Screening <span className="text-gradient-gold">Queue</span></h1>
        </div>
        <p className="mb-8 text-muted-foreground">Review completeness, category correctness, evidence standards, and duplicates before sending to judges.</p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Submitted (Unpaid)', count: submissions.filter(s => s.status === 'submitted').length, color: 'text-warning' },
            { label: 'Paid (Ready to Screen)', count: submissions.filter(s => s.status === 'paid').length, color: 'text-success' },
            { label: 'Total in Queue', count: submissions.length, color: 'text-foreground' },
          ].map(c => (
            <Card key={c.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${c.color}`}>{c.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Applicant Name</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : submissions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No submissions in screening queue</TableCell></TableRow>
              ) : submissions.map(sub => {
                const p = profiles[sub.submitter_id];
                return (
                  <TableRow key={sub.id} className="border-border">
                    <TableCell className="font-medium">
                      <button className="text-primary hover:underline text-left" onClick={() => setViewingId(sub.id)}>
                        {p?.full_name || sub.nominator_name}
                      </button>
                    </TableCell>
                    <TableCell>{sub.school_name}</TableCell>
                    <TableCell>{sub.school_country}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.award_categories?.slice(0, 2).map((c: string) => (
                          <Badge key={c} variant="outline" className="text-[10px] border-border">{c}</Badge>
                        ))}
                        {sub.award_categories?.length > 2 && (
                          <Badge variant="outline" className="text-[10px] border-border">+{sub.award_categories.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={`${statusColor(sub.status)} border-0 text-xs`}>{sub.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setViewingId(sub.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => viewDocuments(sub.id)}><FileText className="h-3.5 w-3.5" /></Button>
                        {(sub.status === 'submitted' || sub.status === 'paid') && (
                          <>
                            <Button size="sm" variant="outline" className="text-success border-success/30 gap-1" onClick={() => openAction(sub.id, 'approve')}>
                              <CheckCircle className="h-3 w-3" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-warning border-warning/30 gap-1" onClick={() => openAction(sub.id, 'request_changes')}>
                              <MessageSquare className="h-3 w-3" /> Changes
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 gap-1" onClick={() => openAction(sub.id, 'reject')}>
                              <XCircle className="h-3 w-3" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Action Dialog */}
        <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setActionId(null); }}>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {actionType === 'approve' && 'Approve Submission'}
                {actionType === 'reject' && 'Reject Submission'}
                {actionType === 'request_changes' && 'Request Changes'}
                {actionType === 'assign' && 'Assign to Panel'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {actionType === 'approve' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Screening checklist:</p>
                  {[
                    { key: 'complete', label: 'Application is complete' },
                    { key: 'categoryCorrect', label: 'Category selection is correct' },
                    { key: 'evidenceOk', label: 'Evidence meets minimum standard' },
                    { key: 'noDuplicate', label: 'No duplicate/plagiarism detected' },
                    { key: 'refsValid', label: 'Reference contacts are valid' },
                  ].map(item => (
                    <label key={item.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={(checklist as any)[item.key]}
                        onChange={e => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="rounded border-border" />
                      {item.label}
                    </label>
                  ))}
                </div>
              )}
              {actionType === 'assign' && (
                <div>
                  <Label>Select Panel</Label>
                  <Select value={selectedPanel} onValueChange={setSelectedPanel}>
                    <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="Choose a panel" /></SelectTrigger>
                    <SelectContent>{panels.map(p => <SelectItem key={p.id} value={p.id}>{p.name || `${p.level} panel`} ({p.level})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>{actionType === 'reject' ? 'Rejection Reason *' : actionType === 'request_changes' ? 'What changes are needed? *' : 'Notes (optional)'}</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder={actionType === 'reject' ? 'Explain why this submission is being rejected...' : actionType === 'request_changes' ? 'Describe what the applicant needs to fix...' : 'Optional screening notes...'}
                  className="mt-1 bg-secondary" />
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleAction}
                disabled={actionType === 'approve' && !Object.values(checklist).every(Boolean)}>
                {actionType === 'approve' ? 'Confirm Approval' : actionType === 'reject' ? 'Confirm Rejection' : actionType === 'request_changes' ? 'Send Change Request' : 'Assign to Panel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Details Dialog — Full page style */}
        <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
          <DialogContent className="max-w-3xl bg-card border-border">
            <DialogHeader><DialogTitle className="font-display text-xl">Application Details</DialogTitle></DialogHeader>
            {viewingSub && (
              <div className="space-y-5 text-sm max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground block text-xs">Applicant</span><span className="font-semibold">{viewingProfile?.full_name || viewingSub.nominator_name}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Email</span>{viewingProfile?.email || viewingSub.nominator_email}</div>
                  <div><span className="text-muted-foreground block text-xs">Phone</span>{viewingProfile?.phone || viewingSub.nominator_phone || 'N/A'}</div>
                  <div><span className="text-muted-foreground block text-xs">Role</span>{viewingSub.nominator_role || 'N/A'}</div>
                  <div><span className="text-muted-foreground block text-xs">School / Organisation</span><span className="font-semibold">{viewingSub.school_name}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Location</span>{viewingSub.school_city}, {viewingSub.school_country}</div>
                  <div><span className="text-muted-foreground block text-xs">Institution Type</span>{viewingSub.institution_type || 'N/A'}</div>
                  <div><span className="text-muted-foreground block text-xs">Size</span>{viewingSub.institution_size || 'N/A'}</div>
                  <div><span className="text-muted-foreground block text-xs">Stage</span>{viewingSub.stage || 'national'}</div>
                  <div><span className="text-muted-foreground block text-xs">Status</span><Badge className={`${statusColor(viewingSub.status)} border-0 text-xs`}>{viewingSub.status}</Badge></div>
                </div>
                <hr className="border-border" />
                <div>
                  <span className="text-muted-foreground text-xs block mb-2">Award Categories</span>
                  <div className="flex flex-wrap gap-2">{viewingSub.award_categories?.map((c: string) => <Badge key={c} variant="outline" className="border-border">{c}</Badge>)}</div>
                </div>
                {/* Per-category nomination statements */}
                {viewingSub.nomination_statements && typeof viewingSub.nomination_statements === 'object' && Object.keys(viewingSub.nomination_statements).length > 0 ? (
                  <div className="space-y-3">
                    <span className="text-muted-foreground text-xs block">Nomination Statements</span>
                    {Object.entries(viewingSub.nomination_statements).map(([cat, text]: any) => (
                      <div key={cat} className="bg-secondary/50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-primary mb-1">{cat}</p>
                        <p className="text-sm whitespace-pre-wrap">{text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <span className="text-muted-foreground text-xs block">Nomination Statement</span>
                    <p className="mt-1">{viewingSub.nomination_statement}</p>
                  </div>
                )}
                {viewingSub.screening_notes && (
                  <div className="bg-warning/10 rounded-lg p-3">
                    <span className="text-xs font-semibold text-warning">AI Screening Notes</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{viewingSub.screening_notes}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { viewDocuments(viewingSub.id); }}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> View Documents
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Documents Dialog */}
        <Dialog open={!!viewDocs} onOpenChange={() => setViewDocs(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader><DialogTitle className="font-display">Supporting Documents</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewDocs?.length === 0 && <p className="text-muted-foreground text-sm">No documents uploaded.</p>}
              {viewDocs?.map(doc => {
                if (!docUrls[doc.file_path]) getSignedUrl(doc.file_path);
                return (
                  <div key={doc.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">{doc.category}</p>
                      </div>
                    </div>
                    {docUrls[doc.file_path] ? (
                      <a href={docUrls[doc.file_path]} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">Open</Button>
                      </a>
                    ) : (
                      <Button variant="ghost" size="sm" disabled>Loading...</Button>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Screening Guide Popup */}
        {showGuide && (
          <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[90vw] animate-fade-in">
            <Card className="glass-card border-primary/30 shadow-xl">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <CardTitle className="font-display text-sm">Screening Guide</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowGuide(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2 max-h-64 overflow-y-auto">
                <p className="font-semibold text-foreground">You are NOT judging quality — only checking eligibility & completeness.</p>
                <div>
                  <p className="font-medium text-foreground">1. Eligibility Check</p>
                  <p>Confirm the applicant fits the award category (e.g., Under 40 for Emerging Leader, rural project for Rural Impact Award).</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">2. Document Completeness</p>
                  <p>Verify required documents were uploaded. If missing, use "Request Changes" to notify the applicant.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">3. AI Integrity Flags</p>
                  <p>Review any AI-generated flags (plagiarism, duplicate submissions, suspicious documents) in the screening notes.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">4. Compliance</p>
                  <p>Check word limits, file formats, no offensive/promotional content.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">5. Duplicate Detection</p>
                  <p>Ensure no repeated submissions — max 3 categories per applicant.</p>
                </div>
                <p className="text-[10px] text-muted-foreground/60 pt-1">Screening is NOT judging. You do not decide winners.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
