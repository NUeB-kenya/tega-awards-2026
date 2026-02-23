import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Star, Eye } from 'lucide-react';

export default function JudgeSubmissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [scoreForm, setScoreForm] = useState({ innovation: 5, impact: 5, scalability: 5, sustainability: 5, comments: '' });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: subs } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user.id);
      const scoreMap: Record<string, any> = {};
      myScores?.forEach(s => { scoreMap[s.submission_id] = s; });
      setSubmissions(subs || []);
      setScores(scoreMap);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleScore = async () => {
    if (!user || !scoringId) return;
    const existing = scores[scoringId];
    const payload = {
      submission_id: scoringId,
      judge_id: user.id,
      innovation_score: scoreForm.innovation,
      impact_score: scoreForm.impact,
      scalability_score: scoreForm.scalability,
      sustainability_score: scoreForm.sustainability,
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
      toast({ title: 'Score saved!' });
      setScoringId(null);
      // refresh
      const { data: myScores } = await supabase.from('scores').select('*').eq('judge_id', user!.id);
      const scoreMap: Record<string, any> = {};
      myScores?.forEach(s => { scoreMap[s.submission_id] = s; });
      setScores(scoreMap);
    }
  };

  const openScoring = (subId: string) => {
    const existing = scores[subId];
    setScoreForm({
      innovation: existing?.innovation_score ?? 5,
      impact: existing?.impact_score ?? 5,
      scalability: existing?.scalability_score ?? 5,
      sustainability: existing?.sustainability_score ?? 5,
      comments: existing?.comments ?? '',
    });
    setScoringId(subId);
  };

  const viewingSub = submissions.find(s => s.id === viewingId);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          Review <span className="text-gradient-gold">Submissions</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Score nominations for the TEGA Awards</p>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
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
                      {scored && (
                        <Badge className="bg-success/20 text-success border-0">
                          Scored: {scores[sub.id].overall_score}/10
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setViewingId(sub.id)}>
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                      <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => openScoring(sub.id)}>
                        <Star className="h-3.5 w-3.5" /> {scored ? 'Re-score' : 'Score'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={!!viewingId} onOpenChange={() => setViewingId(null)}>
          <DialogContent className="max-w-2xl bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Submission Details</DialogTitle>
            </DialogHeader>
            {viewingSub && (
              <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-muted-foreground">Nominator:</span> {viewingSub.nominator_name}</div>
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

        {/* Score Dialog */}
        <Dialog open={!!scoringId} onOpenChange={() => setScoringId(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Score Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(['innovation', 'impact', 'scalability', 'sustainability'] as const).map((field) => (
                <div key={field}>
                  <Label className="capitalize">{field} Score (0-10)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={scoreForm[field]}
                    onChange={e => setScoreForm(prev => ({ ...prev, [field]: parseInt(e.target.value) || 0 }))}
                    className="mt-1 bg-secondary"
                  />
                </div>
              ))}
              <div>
                <Label>Comments</Label>
                <Textarea
                  value={scoreForm.comments}
                  onChange={e => setScoreForm(prev => ({ ...prev, comments: e.target.value }))}
                  className="mt-1 bg-secondary"
                />
              </div>
              <Button className="w-full bg-gradient-gold font-semibold" onClick={handleScore}>Save Score</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
