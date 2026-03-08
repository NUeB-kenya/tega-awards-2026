import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Trophy, Star, Map, Globe, Zap } from 'lucide-react';

export default function SecretariatRouting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [allocating, setAllocating] = useState(false);

  const fetchData = async () => {
    const [subsRes, scoresRes] = await Promise.all([
      supabase.from('submissions').select('*').order('average_score', { ascending: false, nullsFirst: false }),
      supabase.from('scores').select('*'),
    ]);
    setSubmissions(subsRes.data || []);
    setScores(scoresRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getAvgScore = (subId: string) => {
    const subScores = scores.filter(s => s.submission_id === subId);
    if (subScores.length === 0) return null;
    return Math.round(subScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / subScores.length * 10) / 10;
  };

  const national = submissions.filter(s => (s.stage || 'national') === 'national' && s.status === 'scored');
  const continental = submissions.filter(s => s.stage === 'continental');
  const regional = submissions.filter(s => s.stage === 'regional');
  const globalSubs = submissions.filter(s => s.stage === 'global');

  const nationalByCountry: Record<string, any[]> = {};
  national.forEach(s => {
    const country = s.school_country || 'Unknown';
    if (!nationalByCountry[country]) nationalByCountry[country] = [];
    nationalByCountry[country].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  Object.values(nationalByCountry).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  const promoteSubmission = async (subId: string, toStage: string, fromStage: string) => {
    if (!user) return;
    setPromoting(subId);
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;

    const { error } = await supabase.from('submissions').insert({
      submitter_id: sub.submitter_id,
      nominator_name: sub.nominator_name,
      nominator_email: sub.nominator_email,
      nominator_phone: sub.nominator_phone,
      nominator_role: sub.nominator_role,
      school_name: sub.school_name,
      school_city: sub.school_city,
      school_country: sub.school_country,
      institution_type: sub.institution_type,
      institution_size: sub.institution_size,
      nomination_statement: sub.nomination_statement,
      nomination_statements: sub.nomination_statements,
      award_categories: sub.award_categories,
      category_id: sub.category_id,
      region: sub.region,
      stage: toStage,
      status: 'submitted',
      approval_status: 'pending',
      parent_submission_id: sub.id,
      promoted_from_stage: fromStage,
    });

    if (error) {
      toast({ title: 'Promotion failed', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('submissions').update({ status: 'winner' }).eq('id', subId);
      const stageLabels: Record<string, string> = { continental: 'Continental', regional: 'Regional', global: 'Global' };
      await supabase.from('notifications').insert({
        user_id: sub.submitter_id,
        title: `🏆 ${fromStage.charAt(0).toUpperCase() + fromStage.slice(1)} Winner — Promoted to ${stageLabels[toStage]}!`,
        message: `Congratulations! Your application for ${sub.school_name} has won at the ${fromStage} level and is now competing at the ${toStage} stage.`,
        type: 'success',
      });
      toast({ title: `Winner promoted to ${stageLabels[toStage]} stage!` });
    }
    setPromoting(null);
    fetchData();
  };

  const runAutoAllocate = async () => {
    setAllocating(true);
    try {
      const { data, error } = await supabase.functions.invoke('allocate-judges');
      if (error) throw error;
      toast({ title: `Auto-allocation complete: ${data?.assigned || 0} new assignments` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Allocation error', description: e.message, variant: 'destructive' });
    }
    setAllocating(false);
  };

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const renderStageTable = (subs: any[], toStage: string, fromStage: string) => (
    <Card className="glass-card mb-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead>School</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Avg Score</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subs.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">None yet</TableCell></TableRow>
          ) : subs.map(sub => {
            const avg = getAvgScore(sub.id);
            return (
              <TableRow key={sub.id} className="border-border">
                <TableCell className="font-medium">{sub.school_name}</TableCell>
                <TableCell>{sub.school_country}</TableCell>
                <TableCell className={`font-bold ${scoreColor(avg)}`}>{avg != null ? avg : 'Pending'}</TableCell>
                <TableCell><Badge className={`${sub.status === 'winner' ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'} border-0 text-xs`}>{sub.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {sub.status === 'scored' && avg && avg >= 80 && (
                    <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => promoteSubmission(sub.id, toStage, fromStage)} disabled={promoting === sub.id}>
                      <ArrowRight className="h-3 w-3" /> Promote to {toStage.charAt(0).toUpperCase() + toStage.slice(1)}
                    </Button>
                  )}
                  {sub.status === 'winner' && <Badge className="bg-success/20 text-success border-0">Promoted ✓</Badge>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold">Routing <span className="text-gradient-gold">Engine</span></h1>
          <Button variant="outline" size="sm" className="gap-2" onClick={runAutoAllocate} disabled={allocating}>
            <Zap className={`h-4 w-4 ${allocating ? 'animate-spin' : ''}`} />
            {allocating ? 'Allocating...' : 'Auto-Allocate Judges'}
          </Button>
        </div>
        <p className="mb-8 text-muted-foreground">National → Continental → Regional → Global promotion. Winners require ≥80/100 average.</p>

        {/* 4-tier summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'National (Scored)', count: national.length, icon: Star, color: 'text-primary' },
            { label: 'Continental', count: continental.length, icon: Map, color: 'text-accent' },
            { label: 'Regional', count: regional.length, icon: ArrowRight, color: 'text-warning' },
            { label: 'Global', count: globalSubs.length, icon: Trophy, color: 'text-success' },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="pt-6 flex items-center gap-4">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-3xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* National by Country */}
        <h2 className="font-display text-xl font-bold mb-4">National Stage — Scored Submissions</h2>
        {Object.keys(nationalByCountry).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No scored national-stage submissions yet.</p></Card>
        ) : (
          Object.entries(nationalByCountry).map(([country, subs]) => (
            <Card key={country} className="glass-card mb-4">
              <CardHeader className="pb-2"><CardTitle className="font-display text-lg">{country}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Rank</TableHead><TableHead>School</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subs as any[]).map((sub: any, i: number) => (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{sub.school_name}</TableCell>
                        <TableCell className={`font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore != null ? sub.avgScore : '—'}</TableCell>
                        <TableCell><Badge className={`${sub.status === 'winner' ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'} border-0 text-xs`}>{sub.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {sub.status !== 'winner' && sub.avgScore >= 80 && (
                            <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => promoteSubmission(sub.id, 'continental', 'national')} disabled={promoting === sub.id}>
                              <ArrowRight className="h-3 w-3" /> Promote to Continental
                            </Button>
                          )}
                          {sub.status === 'winner' && <Badge className="bg-success/20 text-success border-0">Promoted ✓</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}

        {/* Continental */}
        {continental.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-4 mt-8">Continental Stage</h2>
            {renderStageTable(continental, 'regional', 'continental')}
          </>
        )}

        {/* Regional */}
        {regional.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-4 mt-8">Regional Stage</h2>
            {renderStageTable(regional, 'global', 'regional')}
          </>
        )}

        {/* Global */}
        {globalSubs.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-4 mt-8">🌍 Global Stage</h2>
            <Card className="glass-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>School</TableHead><TableHead>Country</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalSubs.map(sub => {
                    const avg = getAvgScore(sub.id);
                    return (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell className="font-medium">{sub.school_name}</TableCell>
                        <TableCell>{sub.school_country}</TableCell>
                        <TableCell className={`font-bold ${scoreColor(avg)}`}>{avg ?? 'Pending'}/100</TableCell>
                        <TableCell><Badge className="bg-success/20 text-success border-0 text-xs">{sub.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
