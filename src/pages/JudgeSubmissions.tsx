import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Star, Eye, Lock, FileText, MapPin, ChevronDown, Check, ChevronRight } from 'lucide-react';

const VERIFICATION_SOURCES = ['Googled', 'Talked to stakeholders', 'Visited the institution', 'Called the institution', 'Video Called', 'Reviewed official records', 'Third-party verification', 'Other'];

const CRITERIA = [
  { key: 'impact', label: 'Impact & Outcomes', pct: '30%', desc: 'Measurable results, learning outcomes, retention, equity gains', weight: 3.0 },
  { key: 'innovation', label: 'Innovation & Originality', pct: '15%', desc: 'Novel approach, solves real constraints', weight: 1.5 },
  { key: 'scalability', label: 'Scalability & Replicability', pct: '15%', desc: 'Can scale to more learners/regions', weight: 1.5 },
  { key: 'equity', label: 'Equity, Inclusion & Access', pct: '10%', desc: 'Inclusive design, reaching underserved groups', weight: 1.0 },
  { key: 'sustainability', label: 'Sustainability & Governance', pct: '10%', desc: 'Long-term viability, financial resilience', weight: 1.0 },
  { key: 'evidence', label: 'Evidence & Verification', pct: '10%', desc: 'Quality of documentation, third-party proof', weight: 1.0 },
  { key: 'ethics', label: 'Ethics, Safety & Integrity', pct: '10%', desc: 'Child safeguarding, data privacy, transparency', weight: 1.0 },
] as const;

type ScoreFormType = {
  impact: number; innovation: number; scalability: number; equity: number;
  sustainability: number; evidence: number; ethics: number;
  document_satisfaction: number; documents_legitimate: boolean;
  verification_source: string; verification_notes: string; comments: string;
};

const defaultScoreForm: ScoreFormType = {
  impact: 5, innovation: 5, scalability: 5, equity: 5,
  sustainability: 5, evidence: 5, ethics: 5,
  document_satisfaction: 5, documents_legitimate: true,
  verification_source: '', verification_notes: '', comments: '',
};

function DocumentsPanel({ submissionId, category }: { submissionId: string; category: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('submission_documents').select('*').eq('submission_id', submissionId)
      .then(({ data }) => {
        // Filter docs matching category, or show all if no match
        const catDocs = (data || []).filter(d => d.category?.toLowerCase() === category?.toLowerCase());
        setDocs(catDocs.length > 0 ? catDocs : (data || []));
        setLoading(false);
      });
  }, [submissionId, category]);

  const getUrl = async (path: string) => {
    if (urls[path]) return;
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
    if (data?.signedUrl) setUrls(prev => ({ ...prev, [path]: data.signedUrl }));
  };

  if (loading) return <p className="text-xs text-muted-foreground">Loading documents...</p>;
  if (docs.length === 0) return <p className="text-xs text-muted-foreground">No documents for this category.</p>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Submitted Documents</h3>
      <div className="grid gap-2">
        {docs.map(doc => {
          if (!urls[doc.file_path]) getUrl(doc.file_path);
          return (
            <div key={doc.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{doc.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{doc.category} · {doc.file_size ? Math.round(doc.file_size / 1024) + 'KB' : ''}</p>
                </div>
              </div>
              {urls[doc.file_path] ? (
                <a href={urls[doc.file_path]} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">Open</a>
              ) : (
                <span className="text-[10px] text-muted-foreground">Loading...</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function JudgeSubmissions() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [scores, setScores] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoringCategory, setScoringCategory] = useState<string>('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewDocs, setViewDocs] = useState<any[] | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreFormType>({ ...defaultScoreForm });

  const [showCountryUpdate, setShowCountryUpdate] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [countryOpen, setCountryOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');

  const judgeCountry = profile?.country || '';

  const canScoreSubmission = (sub: any) => {
    if (!judgeCountry) return false;
    return sub.school_country?.toLowerCase() === judgeCountry.toLowerCase();
  };

  useEffect(() => {
    supabase.from('countries').select('id, name, phone_code, flag_emoji').order('name').then(({ data }) => {
      if (data) setCountries(data);
    });
  }, []);

  const handleCountryUpdate = async () => {
    if (!user || !selectedCountry) return;
    const { error } = await supabase.from('profiles').update({ country: selectedCountry }).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Country updated to ' + selectedCountry });
      setShowCountryUpdate(false);
      window.location.reload();
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Include 'scored' so judges can see their completed work, and deferred (assigned with DEFERRED notes)
      const { data: subs } = await supabase
        .from('submissions')
        .select('*')
        .in('status', ['submitted', 'paid', 'screened', 'assigned', 'scored'])
        .order('created_at', { ascending: false });
      const { data: allAssignments } = await supabase.from('judge_assignments').select('*');
      const assignMap: Record<string, any> = {};
      allAssignments?.forEach(a => { assignMap[a.submission_id] = a; });

      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user.id);
      // Group scores by submission_id
      const scoreMap: Record<string, any[]> = {};
      myScores?.forEach(s => {
        if (!scoreMap[s.submission_id]) scoreMap[s.submission_id] = [];
        scoreMap[s.submission_id].push(s);
      });

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
      judge_id: user.id, submission_id: subId, status: 'in_progress',
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
    // Set first category as active
    const cats = targetSub.award_categories || [];
    if (cats.length > 0) {
      setScoringCategory(cats[0]);
      loadScoreForCategory(subId, cats[0]);
    }
    setScoringId(subId);
  };

  const loadScoreForCategory = (subId: string, catName: string) => {
    const subScores = scores[subId] || [];
    const existing = subScores.find((s: any) => s.category_name === catName);
    if (existing) {
      setScoreForm({
        impact: existing.impact_score ?? 5,
        innovation: existing.innovation_score ?? 5,
        scalability: existing.scalability_score ?? 5,
        equity: existing.criterion_equity ?? 5,
        sustainability: existing.sustainability_score ?? 5,
        evidence: existing.criterion_evidence ?? 5,
        ethics: existing.criterion_ethics ?? 5,
        document_satisfaction: existing.document_satisfaction ?? 5,
        documents_legitimate: existing.documents_legitimate ?? true,
        verification_source: existing.verification_source ?? '',
        verification_notes: existing.verification_notes ?? '',
        comments: existing.comments ?? '',
      });
    } else {
      setScoreForm({ ...defaultScoreForm });
    }
    setScoringCategory(catName);
  };

  const handleScoreCategory = async () => {
    if (!user || !scoringId || !scoringCategory) return;
    const targetSub = submissions.find(s => s.id === scoringId);
    if (!targetSub || !canScoreSubmission(targetSub)) {
      toast({ title: 'Scoring restricted', variant: 'destructive' });
      return;
    }

    // Check low score comment requirement
    const hasLow = [scoreForm.impact, scoreForm.innovation, scoreForm.scalability, scoreForm.equity, scoreForm.sustainability, scoreForm.evidence, scoreForm.ethics].some(v => v < 4);
    if (hasLow && !scoreForm.comments.trim()) {
      toast({ title: 'Comment required', description: 'You gave a low score — please explain in the comments.', variant: 'destructive' });
      return;
    }

    const subScores = scores[scoringId] || [];
    const existing = subScores.find((s: any) => s.category_name === scoringCategory);

    const payload = {
      submission_id: scoringId,
      judge_id: user.id,
      category_name: scoringCategory,
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
      toast({ title: `Score saved for "${scoringCategory}"` });

      // Check if all categories are scored
      const cats = targetSub.award_categories || [];
      const updatedScores = [...subScores.filter((s: any) => s.category_name !== scoringCategory), { ...payload, id: existing?.id || 'new' }];
      const allScored = cats.every((c: string) => updatedScores.some((s: any) => s.category_name === c));

      if (allScored) {
        await supabase.from('judge_assignments').update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('judge_id', user.id).eq('submission_id', scoringId);

        // Clear deferred status and update to scored
        const wasDeferred = targetSub.screening_notes?.startsWith('DEFERRED:');
        await supabase.from('submissions').update({ 
          status: 'scored',
          screening_notes: wasDeferred ? targetSub.screening_notes?.replace('DEFERRED: ', 'RE-EVALUATED: ') : targetSub.screening_notes,
        }).eq('id', scoringId);

        // Compute and store average score on submission
        const allSubScores = [...updatedScores];
        const avgScore = allSubScores.reduce((a, s) => a + (s.overall_score || ((s.impact * 3) + (s.innovation * 1.5) + (s.scalability * 1.5) + (s.equity * 1) + (s.sustainability * 1) + (s.evidence * 1) + (s.ethics * 1)) || 0), 0) / Math.max(allSubScores.length, 1);
        await supabase.from('submissions').update({ average_score: Math.round(avgScore * 100) / 100 }).eq('id', scoringId);

        // Notify the secretariat member who deferred this case
        if (wasDeferred && targetSub.screened_by) {
          await supabase.from('notifications').insert({
            user_id: targetSub.screened_by,
            title: '🔄 Deferred Case Re-evaluated',
            message: `The deferred submission "${targetSub.school_name}" has been re-scored by the judge. New average: ${Math.round(avgScore * 100) / 100}. Please review the updated scores.`,
            type: 'info',
            link: '/secretariat/scores',
          });
        }
      }

      // Refresh scores
      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user.id);
      const scoreMap: Record<string, any[]> = {};
      myScores?.forEach(s => {
        if (!scoreMap[s.submission_id]) scoreMap[s.submission_id] = [];
        scoreMap[s.submission_id].push(s);
      });
      setScores(scoreMap);

      // Move to next unscored category
      const nextUnscored = cats.find((c: string) => c !== scoringCategory && !updatedScores.some((s: any) => s.category_name === c));
      if (nextUnscored) {
        loadScoreForCategory(scoringId, nextUnscored);
        toast({ title: 'Moving to next category', description: nextUnscored });
      } else {
        toast({ title: 'All categories scored for this submission!' });
      }
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
  const scoringSub = submissions.find(s => s.id === scoringId);

  const getOverallScore = (form: ScoreFormType) => (
    (form.impact * 3) + (form.innovation * 1.5) + (form.scalability * 1.5) +
    (form.equity * 1) + (form.sustainability * 1) + (form.evidence * 1) + (form.ethics * 1)
  );

  const getScoreBand = (score: number) => {
    if (score >= 90) return '🏆 World-class, award-defining';
    if (score >= 80) return '⭐ Exceptional, category-leading';
    if (score >= 70) return '✓ Strong, credible contender';
    if (score >= 60) return '○ Promising but not yet elite';
    return '✗ Insufficient for finalist status';
  };

  const getCategoryScoredCount = (subId: string) => {
    return (scores[subId] || []).length;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          Verify <span className="text-gradient-gold">Applications</span>
        </h1>
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <p className="text-muted-foreground">
            Score each category individually. Scoring restricted to <strong>{judgeCountry || 'your assigned country'}</strong>.
          </p>
          {!judgeCountry && (
            <Button variant="outline" size="sm" className="gap-1 text-warning border-warning/30" onClick={() => setShowCountryUpdate(true)}>
              <MapPin className="h-3 w-3" /> Set Your Country
            </Button>
          )}
          {judgeCountry && Object.keys(scores).length === 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowCountryUpdate(true)}>
              <MapPin className="h-3 w-3" /> Update Country
            </Button>
          )}
          {judgeCountry && Object.keys(scores).length > 0 && (
            <Badge variant="outline" className="gap-1 text-xs border-border">
              <MapPin className="h-3 w-3" /> {judgeCountry} (locked)
            </Badge>
          )}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <Card className="glass-card py-12 text-center">
            <p className="text-muted-foreground">No applications available yet.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Deferred applications - returned by secretariat */}
            {(() => {
              const deferred = submissions.filter(sub => 
                sub.status === 'assigned' && sub.screening_notes?.startsWith('DEFERRED:') &&
                assignments[sub.id]?.judge_id === user?.id
              );
              if (deferred.length === 0) return null;
              return (
                <div>
                  <h2 className="font-display text-lg font-semibold mb-3 text-warning flex items-center gap-2">
                    🔄 Deferred — Re-evaluation Required ({deferred.length})
                  </h2>
                  <div className="space-y-3">
                    {deferred.map(sub => (
                      <Card key={sub.id} className="glass-card border-warning/30">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{sub.school_name}</h3>
                              <p className="text-sm text-muted-foreground">{sub.school_city}, {sub.school_country}</p>
                              <div className="mt-2 bg-warning/10 rounded-lg p-2">
                                <p className="text-xs font-semibold text-warning">Secretariat Notes:</p>
                                <p className="text-xs text-muted-foreground mt-1">{sub.screening_notes?.replace('DEFERRED: ', '')}</p>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {sub.award_categories?.map((cat: string) => {
                                  const scored = (scores[sub.id] || []).some((s: any) => s.category_name === cat);
                                  return (
                                    <Badge key={cat} variant="outline" className={`text-xs ${scored ? 'border-success/50 text-success' : 'border-border'}`}>
                                      {scored && '✓ '}{cat}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingId(sub.id)}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                              <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => openScoring(sub.id)}>
                                <Star className="h-3.5 w-3.5" /> Re-score
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Regular submissions */}
            <div>
              <h2 className="font-display text-lg font-semibold mb-3">Applications</h2>
              <div className="space-y-4">
                {submissions.filter(sub => !(sub.status === 'assigned' && sub.screening_notes?.startsWith('DEFERRED:') && assignments[sub.id]?.judge_id === user?.id)).map((sub) => {
                  const assignment = assignments[sub.id];
                  const isAssignedToOther = assignment && assignment.judge_id !== user?.id;
                  const isAssignedToMe = assignment && assignment.judge_id === user?.id;
                  const isEligibleForScoring = canScoreSubmission(sub);
                  const totalCats = sub.award_categories?.length || 0;
                  const scoredCats = getCategoryScoredCount(sub.id);
                  const allScored = totalCats > 0 && scoredCats >= totalCats;
                  const isAlreadyScored = sub.status === 'scored' || sub.status === 'winner' || sub.status === 'finalist' || sub.average_score != null;
                  const isDeferred = sub.screening_notes?.startsWith('DEFERRED:');
                  const hasAnyAssignment = !!assignment;

                  // Judges can only pick unscored, unassigned submissions
                  const canPick = isEligibleForScoring && !hasAnyAssignment && !isAlreadyScored;
                  // Re-score allowed max 2 times (unless deferred by secretariat)
                  const myScoreCount = (scores[sub.id] || []).length;
                  const rescoreLimit = isDeferred ? Infinity : 2;
                  const canRescore = isEligibleForScoring && isAssignedToMe && myScoreCount < rescoreLimit * totalCats;

                  return (
                    <Card key={sub.id} className="glass-card">
                      <CardContent className="flex items-center justify-between p-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{sub.school_name}</h3>
                            {isAlreadyScored && (
                              <Badge className="bg-success/20 text-success border-0 text-[10px]">{sub.status}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{sub.school_city}, {sub.school_country} · {sub.nominator_name}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {sub.award_categories?.map((cat: string) => {
                              const scored = (scores[sub.id] || []).some((s: any) => s.category_name === cat);
                              return (
                                <Badge key={cat} variant="outline" className={`text-xs ${scored ? 'border-success/50 text-success' : 'border-border'}`}>
                                  {scored && '✓ '}{cat}
                                </Badge>
                              );
                            })}
                          </div>
                          {scoredCats > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {scoredCats}/{totalCats} categories scored
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(isAssignedToOther || (isAlreadyScored && !isAssignedToMe)) ? (
                            <Badge className="bg-destructive/20 text-destructive border-0 gap-1">
                              <Lock className="h-3 w-3" /> {isAlreadyScored ? 'Already judged' : 'Assigned to another judge'}
                            </Badge>
                          ) : (
                            <>
                              {!isEligibleForScoring && (
                                <Badge className="bg-warning/20 text-warning border-0">View only</Badge>
                              )}
                              {allScored && (
                                <Badge className="bg-success/20 text-success border-0">All scored</Badge>
                              )}
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingId(sub.id)}>
                                <Eye className="h-3.5 w-3.5" /> View
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => viewDocuments(sub.id)}>
                                <FileText className="h-3.5 w-3.5" /> Docs
                              </Button>
                              {canPick && (
                                <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => pickSubmission(sub.id)}>
                                  Pick
                                </Button>
                              )}
                              {isAssignedToMe && canRescore && (
                                <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => openScoring(sub.id)}>
                                  <Star className="h-3.5 w-3.5" /> {allScored ? 'Re-score' : 'Score'}
                                </Button>
                              )}
                              {isAssignedToMe && !canRescore && allScored && (
                                <Badge className="bg-muted text-muted-foreground border-0 text-[10px]">Re-score limit reached</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
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
                {/* Per-category nomination statements — always shown prominently */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Nomination Statements
                  </h3>
                  {viewingSub.nomination_statements && typeof viewingSub.nomination_statements === 'object' && Object.keys(viewingSub.nomination_statements).length > 0 ? (
                    <>
                      {(viewingSub.award_categories || []).map((cat: string) => {
                        const text = (viewingSub.nomination_statements as Record<string, string>)?.[cat];
                        return (
                          <div key={cat} className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                            <p className="text-xs font-semibold text-primary mb-1">{cat}</p>
                            {text ? (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{text}</p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No statement provided for this category.</p>
                            )}
                          </div>
                        );
                      })}
                    </>
                  ) : viewingSub.nomination_statement && viewingSub.nomination_statement !== 'See per-category statements' ? (
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{viewingSub.nomination_statement}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No nomination statements provided.</p>
                  )}
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

        {/* Per-Category Scoring Dialog */}
        <Dialog open={!!scoringId} onOpenChange={() => setScoringId(null)}>
          <DialogContent className="max-w-4xl bg-card border-border max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Score: {scoringSub?.school_name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">Score each category individually using the 7 criteria.</p>
            </DialogHeader>

            {scoringSub && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Category Tabs */}
                <Tabs value={scoringCategory} onValueChange={(cat) => loadScoreForCategory(scoringId!, cat)} className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-secondary/50 p-1">
                    {scoringSub.award_categories?.map((cat: string) => {
                      const scored = (scores[scoringId!] || []).some((s: any) => s.category_name === cat);
                      return (
                        <TabsTrigger key={cat} value={cat} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          {scored && '✓ '}{cat.length > 30 ? cat.slice(0, 30) + '…' : cat}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {scoringSub.award_categories?.map((cat: string) => (
                    <TabsContent key={cat} value={cat} className="flex-1 overflow-y-auto space-y-6 mt-4 pr-2">
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                        <p className="text-sm font-semibold text-primary">{cat}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Score this category using the 7 criteria below. Each scored 0–10, auto-weighted to 100 points.
                        </p>
                      </div>

                      {/* Nomination Statement - prominent display */}
                      <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2 text-accent-foreground mb-2">
                          <FileText className="h-4 w-4 text-primary" /> Nomination Statement — {cat}
                        </h3>
                        {scoringSub.nomination_statements && typeof scoringSub.nomination_statements === 'object' && (scoringSub.nomination_statements as Record<string, string>)[cat] ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{(scoringSub.nomination_statements as Record<string, string>)[cat]}</p>
                        ) : scoringSub.nomination_statement && scoringSub.nomination_statement !== 'See per-category statements' ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{scoringSub.nomination_statement}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No nomination statement provided for this category.</p>
                        )}
                      </div>

                      {/* Documents for this category */}
                      <DocumentsPanel submissionId={scoringId!} category={cat} />

                      {/* Document verification */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Document Verification</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Document satisfaction (0-10)</Label>
                            <Input type="number" min={0} max={10} value={scoreForm.document_satisfaction}
                              onChange={e => setScoreForm(p => ({ ...p, document_satisfaction: parseInt(e.target.value) || 0 }))}
                              className="mt-1 bg-secondary w-24" />
                          </div>
                          <div>
                            <Label className="text-xs">Documents legitimate?</Label>
                            <RadioGroup value={scoreForm.documents_legitimate ? 'yes' : 'no'}
                              onValueChange={v => setScoreForm(p => ({ ...p, documents_legitimate: v === 'yes' }))}
                              className="flex gap-4 mt-1">
                              <div className="flex items-center gap-2"><RadioGroupItem value="yes" /><Label className="text-xs">Yes</Label></div>
                              <div className="flex items-center gap-2"><RadioGroupItem value="no" /><Label className="text-xs">No</Label></div>
                            </RadioGroup>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Source of verification</Label>
                            <Select value={scoreForm.verification_source} onValueChange={v => setScoreForm(p => ({ ...p, verification_source: v }))}>
                              <SelectTrigger className="mt-1 bg-secondary text-xs"><SelectValue placeholder="How verified?" /></SelectTrigger>
                              <SelectContent>{VERIFICATION_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Verification Notes</Label>
                            <Textarea value={scoreForm.verification_notes}
                              onChange={e => setScoreForm(p => ({ ...p, verification_notes: e.target.value }))}
                              placeholder="Describe verification..."
                              className="mt-1 bg-secondary text-xs min-h-[60px]" />
                          </div>
                        </div>
                      </div>

                      {/* Scoring Criteria */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm">Scoring Criteria</h3>
                        {CRITERIA.map(({ key, label, pct, desc, weight }) => (
                          <div key={key} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">{label}</Label>
                              <Badge variant="outline" className="border-border text-[10px] font-semibold">{pct}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                            <div className="flex items-center gap-4">
                              <Slider min={0} max={10} step={1}
                                value={[scoreForm[key as keyof ScoreFormType] as number]}
                                onValueChange={([v]) => setScoreForm(p => ({ ...p, [key]: v }))}
                                className="flex-1" />
                              <span className="w-20 text-right text-xs font-bold tabular-nums">
                                {scoreForm[key as keyof ScoreFormType] as number}/10
                                <span className="text-[10px] text-muted-foreground ml-1">({((scoreForm[key as keyof ScoreFormType] as number) * weight).toFixed(1)})</span>
                              </span>
                            </div>
                            {(scoreForm[key as keyof ScoreFormType] as number) < 4 && (
                              <p className="text-[10px] text-destructive">⚠ Low score — comment required</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label className="text-xs">Comments {[scoreForm.impact, scoreForm.innovation, scoreForm.scalability, scoreForm.equity, scoreForm.sustainability, scoreForm.evidence, scoreForm.ethics].some(v => v < 4) ? '(Required)' : ''}</Label>
                        <Textarea value={scoreForm.comments}
                          onChange={e => setScoreForm(p => ({ ...p, comments: e.target.value }))}
                          className="mt-1 bg-secondary text-xs" />
                      </div>

                      {/* Score summary */}
                      <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
                        <p className="font-semibold">Category Score: {getOverallScore(scoreForm).toFixed(1)}/100</p>
                        <p className="text-muted-foreground text-xs">{getScoreBand(getOverallScore(scoreForm))}</p>
                      </div>

                      <Button className="w-full bg-gradient-gold font-semibold" onClick={handleScoreCategory}>
                        Save Score for "{cat.length > 40 ? cat.slice(0, 40) + '…' : cat}"
                      </Button>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Country Update Dialog */}
        <Dialog open={showCountryUpdate} onOpenChange={setShowCountryUpdate}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Update Your Country</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Select your country to enable scoring.</p>
            <div className="space-y-4">
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between bg-secondary border-border">
                    {selectedCountry || 'Select your country'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {countries.map(c => (
                          <CommandItem key={c.id} value={`${c.name} ${c.phone_code}`}
                            onSelect={() => { setSelectedCountry(c.name); setCountryOpen(false); }}>
                            <span className="mr-2">{c.flag_emoji}</span>
                            <span className="flex-1">{c.name}</span>
                            {selectedCountry === c.name && <Check className="ml-2 h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleCountryUpdate} disabled={!selectedCountry}>
                Save Country
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
