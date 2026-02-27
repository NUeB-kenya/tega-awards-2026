import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Star, Eye, Lock, FileText } from 'lucide-react';

const VERIFICATION_SOURCES = ['Googled', 'Talked to stakeholders', 'Visited the institution', 'Called the institution', 'Video Called', 'Reviewed official records', 'Third-party verification', 'Other'];

export default function JudgeSubmissions() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [scores, setScores] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewDocs, setViewDocs] = useState<any[] | null>(null);

  const [scoreForm, setScoreForm] = useState({
    impact: 5, innovation: 5, scalability: 5, equity: 5,
    sustainability: 5, evidence: 5, ethics: 5,
    document_satisfaction: 5, documents_legitimate: true,
    verification_source: '', verification_notes: '', comments: '',
  });

  const judgeCountry = profile?.country || '';

  const canScoreSubmission = (sub: any) => {
    if (!judgeCountry) return false;
    return sub.school_country?.toLowerCase() === judgeCountry.toLowerCase();
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Judges can view all screened/submitted applications; scoring remains country-restricted
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .in('status', ['submitted', 'paid', 'screened', 'assigned'])
        .order('created_at', { ascending: false });
      const { data: allAssignments } = await supabase.from('judge_assignments').select('*');
      const assignMap: Record<string, any> = {};
      allAssignments?.forEach(a => { assignMap[a.submission_id] = a; });

      // Get my scores
      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user.id);
      const scoreMap: Record<string, any> = {};
      myScores?.forEach(s => { scoreMap[s.submission_id] = s; });

      setSubmissions(subs || []);
      setAssignments(assignMap);
      setScores(scoreMap);
      setLoading(false);
    };
    fetchData();
  }, [user, judgeCountry]);

  const pickSubmission = async (subId: string) => {
    if (!user) return;
    const targetSub = submissions.find(s => s.id === subId);
    if (!targetSub || !canScoreSubmission(targetSub)) {
      toast({ title: 'Scoring restricted', description: 'You can only score applications from your country.', variant: 'destructive' });
      return;
    }
    const existing = assignments[subId];
    if (existing && existing.judge_id !== user.id) {
      toast({ title: 'Already assigned', description: 'Another judge is verifying this submission.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('judge_assignments').insert({
      judge_id: user.id,
      submission_id: subId,
      status: 'in_progress',
    });
    if (error) {
      if (error.message.includes('duplicate')) {
        toast({ title: 'Already picked', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Submission picked for verification!' });
      setAssignments(prev => ({ ...prev, [subId]: { judge_id: user.id, status: 'in_progress' } }));
    }
  };

  const openScoring = (subId: string) => {
    const targetSub = submissions.find(s => s.id === subId);
    if (!targetSub || !canScoreSubmission(targetSub)) {
      toast({ title: 'Scoring restricted', description: 'You can only score applications from your country.', variant: 'destructive' });
      return;
    }
    const existing = scores[subId];
    setScoreForm({
      impact: existing?.impact_score ?? 5,
      innovation: existing?.innovation_score ?? 5,
      scalability: existing?.scalability_score ?? 5,
      equity: existing?.criterion_equity ?? 5,
      sustainability: existing?.sustainability_score ?? 5,
      evidence: existing?.criterion_evidence ?? 5,
      ethics: existing?.criterion_ethics ?? 5,
      document_satisfaction: existing?.document_satisfaction ?? 5,
      documents_legitimate: existing?.documents_legitimate ?? true,
      verification_source: existing?.verification_source ?? '',
      verification_notes: existing?.verification_notes ?? '',
      comments: existing?.comments ?? '',
    });
    setScoringId(subId);
  };

  const handleScore = async () => {
    if (!user || !scoringId) return;
    const targetSub = submissions.find(s => s.id === scoringId);
    if (!targetSub || !canScoreSubmission(targetSub)) {
      toast({ title: 'Scoring restricted', description: 'You can only score applications from your country.', variant: 'destructive' });
      return;
    }
    const existing = scores[scoringId];
    
    // Weighted scoring: Impact(30%) + Innovation(15%) + Scalability(15%) + Equity(10%) + Sustainability(10%) + Evidence(10%) + Ethics(10%)
    const overall = (
      (scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
      (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1)
    );

    const payload = {
      submission_id: scoringId,
      judge_id: user.id,
      innovation_score: scoreForm.innovation,
      impact_score: scoreForm.impact,
      scalability_score: scoreForm.scalability,
      sustainability_score: scoreForm.sustainability,
      criterion_equity: scoreForm.equity,
      criterion_evidence: scoreForm.evidence,
      criterion_ethics: scoreForm.ethics,
      document_satisfaction: scoreForm.document_satisfaction,
      documents_legitimate: scoreForm.documents_legitimate,
      verification_source: scoreForm.verification_source,
      verification_notes: scoreForm.verification_notes,
      comments: scoreForm.comments,
      overall_score: overall,
    };

    let error;
    if (existing) {
      ({ error } = await supabase.from('scores').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('scores').insert(payload));
    }

    if (error) {
      toast({ title: 'Error saving score', description: error.message, variant: 'destructive' });
    } else {
      // Mark assignment as completed
      await supabase.from('judge_assignments').update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('judge_id', user.id).eq('submission_id', scoringId);
      
      toast({ title: 'Score saved!' });
      setScoringId(null);
      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user.id);
      const scoreMap: Record<string, any> = {};
      myScores?.forEach(s => { scoreMap[s.submission_id] = s; });
      setScores(scoreMap);
    }
  };

  const viewDocuments = async (subId: string) => {
    const { data } = await supabase.from('submission_documents').select('*').eq('submission_id', subId);
    setViewDocs(data || []);
  };

  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const getSignedUrl = async (filePath: string) => {
    if (docUrls[filePath]) return docUrls[filePath];
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      setDocUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
      return data.signedUrl;
    }
    return '#';
  };

  const viewingSub = submissions.find(s => s.id === viewingId);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          Verify <span className="text-gradient-gold">Applications</span>
        </h1>
        <p className="mb-8 text-muted-foreground">
          You can view all applications. Scoring is restricted to {judgeCountry || 'your assigned country'} submissions only.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
            <Card className="glass-card py-12 text-center">
              <p className="text-muted-foreground">No applications available yet.</p>
            </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const assignment = assignments[sub.id];
              const isAssignedToOther = assignment && assignment.judge_id !== user?.id;
              const isAssignedToMe = assignment && assignment.judge_id === user?.id;
              const isEligibleForScoring = canScoreSubmission(sub);
              const scored = !!scores[sub.id];

              return (
                <Card key={sub.id} className="glass-card">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="flex-1">
                      <h3 className="font-semibold">{sub.school_name}</h3>
                      <p className="text-sm text-muted-foreground">{sub.school_city}, {sub.school_country} · {sub.nominator_name}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sub.award_categories?.map((cat: string) => (
                          <Badge key={cat} variant="outline" className="text-xs border-border">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEligibleForScoring && (
                        <Badge className="bg-warning/20 text-warning border-0">
                          View only (outside your country)
                        </Badge>
                      )}
                      {isAssignedToOther && (
                        <Badge className="bg-warning/20 text-warning border-0 gap-1">
                          <Lock className="h-3 w-3" /> Verification ongoing
                        </Badge>
                      )}
                      {scored && (
                        <Badge className="bg-success/20 text-success border-0">
                          Scored: {scores[sub.id].overall_score}/100
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingId(sub.id)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => viewDocuments(sub.id)}>
                        <FileText className="h-3.5 w-3.5" /> Docs
                      </Button>
                      {isEligibleForScoring && !isAssignedToOther && !scored && !isAssignedToMe && (
                        <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => pickSubmission(sub.id)}>
                          Pick
                        </Button>
                      )}
                      {isEligibleForScoring && isAssignedToMe && !scored && (
                        <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => openScoring(sub.id)}>
                          <Star className="h-3.5 w-3.5" /> Score
                        </Button>
                      )}
                      {isEligibleForScoring && scored && (
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => openScoring(sub.id)}>
                          Re-score
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Details Dialog */}
        <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Application Details</DialogTitle>
            </DialogHeader>
            {viewingSub && (
              <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Applicant:</span> {viewingSub.nominator_name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {viewingSub.nominator_email}</div>
                  <div><span className="text-muted-foreground">Phone:</span> {viewingSub.nominator_phone || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Role:</span> {viewingSub.nominator_role || 'N/A'}</div>
                </div>
                <hr className="border-border" />
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">School:</span> {viewingSub.school_name}</div>
                  <div><span className="text-muted-foreground">Location:</span> {viewingSub.school_city}, {viewingSub.school_country}</div>
                  <div><span className="text-muted-foreground">Type:</span> {viewingSub.institution_type || 'N/A'}</div>
                  <div><span className="text-muted-foreground">Size:</span> {viewingSub.institution_size || 'N/A'}</div>
                </div>
                <hr className="border-border" />
                <div>
                  <span className="text-muted-foreground">Categories:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {viewingSub.award_categories?.map((c: string) => <Badge key={c} variant="outline" className="border-border">{c}</Badge>)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Nomination Statement:</span>
                  <p className="mt-1">{viewingSub.nomination_statement}</p>
                </div>
                {viewingSub.past_awards && <div><span className="text-muted-foreground">Past Awards:</span> {viewingSub.past_awards}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Documents Dialog */}
        <Dialog open={!!viewDocs} onOpenChange={() => setViewDocs(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Supporting Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewDocs?.length === 0 && <p className="text-muted-foreground text-sm">No documents uploaded.</p>}
              {viewDocs?.map(doc => {
                if (!docUrls[doc.file_path]) {
                  getSignedUrl(doc.file_path);
                }
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

        {/* Scoring Dialog - Comprehensive Rubric */}
        <Dialog open={!!scoringId} onOpenChange={() => setScoringId(null)}>
          <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Verification & Scoring</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Prestige Scoring Rubric</p>
                <p className="text-muted-foreground">Each criterion scored 0–10, auto-weighted to 100%. Minimum 80/100 average to win.</p>
              </div>

              {/* Document verification */}
              <div className="space-y-4">
                <h3 className="font-semibold">Document Verification</h3>
                <div>
                  <Label>How satisfied are you with the uploaded documents? (0-10)</Label>
                  <Input type="number" min={0} max={10} value={scoreForm.document_satisfaction}
                    onChange={e => setScoreForm(p => ({ ...p, document_satisfaction: parseInt(e.target.value) || 0 }))}
                    className="mt-1 bg-secondary w-24" />
                </div>
                <div>
                  <Label>Are the uploaded documents legitimate?</Label>
                  <RadioGroup value={scoreForm.documents_legitimate ? 'yes' : 'no'}
                    onValueChange={v => setScoreForm(p => ({ ...p, documents_legitimate: v === 'yes' }))}
                    className="flex gap-4 mt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="yes" /><Label>Yes</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="no" /><Label>No</Label></div>
                  </RadioGroup>
                </div>
                <div>
                  <Label>Source of verification</Label>
                  <Select value={scoreForm.verification_source} onValueChange={v => setScoreForm(p => ({ ...p, verification_source: v }))}>
                    <SelectTrigger className="mt-1 bg-secondary"><SelectValue placeholder="How did you verify?" /></SelectTrigger>
                    <SelectContent>
                      {VERIFICATION_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Verification Notes</Label>
                  <Textarea value={scoreForm.verification_notes}
                    onChange={e => setScoreForm(p => ({ ...p, verification_notes: e.target.value }))}
                    placeholder="Describe your verification process..."
                    className="mt-1 bg-secondary" />
                </div>
              </div>

              {/* Core scoring - weighted rubric */}
              <div className="space-y-4">
                <h3 className="font-semibold">Scoring Criteria</h3>
                {([
                  { key: 'impact', label: 'Impact & Outcomes (30%) — Measurable results, learning outcomes, retention, equity gains', weight: 30 },
                  { key: 'innovation', label: 'Innovation & Originality (15%) — Novel approach, solves real constraints', weight: 15 },
                  { key: 'scalability', label: 'Scalability & Replicability (15%) — Can scale to more learners/regions', weight: 15 },
                  { key: 'equity', label: 'Equity, Inclusion & Access (10%) — Inclusive design, reaching underserved groups', weight: 10 },
                  { key: 'sustainability', label: 'Sustainability & Governance (10%) — Long-term viability, financial resilience', weight: 10 },
                  { key: 'evidence', label: 'Evidence & Verification (10%) — Quality of documentation, third-party proof', weight: 10 },
                  { key: 'ethics', label: 'Ethics, Safety & Integrity (10%) — Child safeguarding, data privacy, transparency', weight: 10 },
                ] as const).map(({ key, label, weight }) => (
                  <div key={key}>
                    <Label>{label} (0-10)</Label>
                    <Input type="number" min={0} max={10}
                      value={scoreForm[key]}
                      onChange={e => setScoreForm(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                      className="mt-1 bg-secondary w-24" />
                    {scoreForm[key] < 4 && (
                      <p className="text-xs text-destructive mt-1">⚠ Low score — comment required below</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <Label>Additional Comments {([scoreForm.impact, scoreForm.innovation, scoreForm.scalability, scoreForm.equity, scoreForm.sustainability, scoreForm.evidence, scoreForm.ethics].some(v => v < 4)) ? '(Required — low score given)' : ''}</Label>
                <Textarea value={scoreForm.comments}
                  onChange={e => setScoreForm(p => ({ ...p, comments: e.target.value }))}
                  className="mt-1 bg-secondary" />
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-semibold">Projected Overall Score: {
                  ((scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
                  (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1))
                }/100</p>
                <p className="text-muted-foreground text-xs">
                  {((scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
                  (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1)) >= 90
                    ? '🏆 World-class, award-defining'
                    : ((scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
                    (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1)) >= 80
                    ? '⭐ Exceptional, category-leading'
                    : ((scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
                    (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1)) >= 70
                    ? '✓ Strong, credible contender'
                    : ((scoreForm.impact * 3) + (scoreForm.innovation * 1.5) + (scoreForm.scalability * 1.5) + 
                    (scoreForm.equity * 1) + (scoreForm.sustainability * 1) + (scoreForm.evidence * 1) + (scoreForm.ethics * 1)) >= 60
                    ? '○ Promising but not yet elite'
                    : '✗ Insufficient for finalist status'}
                </p>
              </div>

              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleScore}>
                Submit Verification & Score
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
