import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Trophy, Star } from 'lucide-react';

export default function SecretariatRouting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);

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

  // Calculate average scores per submission
  const getAvgScore = (subId: string) => {
    const subScores = scores.filter(s => s.submission_id === subId);
    if (subScores.length === 0) return null;
    const avg = subScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / subScores.length;
    return Math.round(avg * 10) / 10;
  };

  // Group submissions by stage
  const national = submissions.filter(s => (s.stage || 'national') === 'national' && s.status === 'scored');
  const regional = submissions.filter(s => s.stage === 'regional');
  const global = submissions.filter(s => s.stage === 'global');

  // Group national winners by country
  const nationalByCountry: Record<string, any[]> = {};
  national.forEach(s => {
    const country = s.school_country || 'Unknown';
    if (!nationalByCountry[country]) nationalByCountry[country] = [];
    nationalByCountry[country].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  // Sort each country group by score
  Object.values(nationalByCountry).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  const promoteToRegional = async (subId: string) => {
    if (!user) return;
    setPromoting(subId);
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;

    // Create a regional-stage clone
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
      award_categories: sub.award_categories,
      category_id: sub.category_id,
      region: sub.region,
      stage: 'regional',
      status: 'submitted',
      approval_status: 'pending',
      parent_submission_id: sub.id,
      promoted_from_stage: 'national',
    });

    if (error) {
      toast({ title: 'Promotion failed', description: error.message, variant: 'destructive' });
    } else {
      // Mark original as finalist/winner at national level
      await supabase.from('submissions').update({ status: 'winner' }).eq('id', subId);
      
      await supabase.from('notifications').insert({
        user_id: sub.submitter_id,
        title: '🏆 National Winner — Promoted to Regional!',
        message: `Congratulations! Your application for ${sub.school_name} has won at the national level and is now competing at the regional stage.`,
        type: 'success',
      });

      await supabase.rpc('log_audit' as any, {
        _user_id: user.id,
        _action_type: 'promoted_to_regional',
        _entity_type: 'submission',
        _entity_id: subId,
      });

      toast({ title: 'Winner promoted to Regional stage!' });
    }
    setPromoting(null);
    fetchData();
  };

  const promoteToGlobal = async (subId: string) => {
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
      award_categories: sub.award_categories,
      category_id: sub.category_id,
      region: sub.region,
      stage: 'global',
      status: 'submitted',
      approval_status: 'pending',
      parent_submission_id: sub.id,
      promoted_from_stage: 'regional',
    });

    if (error) {
      toast({ title: 'Promotion failed', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('submissions').update({ status: 'winner' }).eq('id', subId);
      await supabase.from('notifications').insert({
        user_id: sub.submitter_id,
        title: '🌍 Regional Winner — Promoted to Global!',
        message: `Your application for ${sub.school_name} has won at the regional level and is now competing globally.`,
        type: 'success',
      });
      toast({ title: 'Winner promoted to Global stage!' });
    }
    setPromoting(null);
    fetchData();
  };

  const stageColor = (stage: string) => {
    if (stage === 'national') return 'bg-primary/20 text-primary';
    if (stage === 'regional') return 'bg-warning/20 text-warning';
    return 'bg-success/20 text-success';
  };

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">Routing <span className="text-gradient-gold">Engine</span></h1>
        <p className="mb-8 text-muted-foreground">National → Regional → Global promotion. Winners require ≥80/100 average.</p>

        {/* Stage summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'National (Scored)', count: national.length, icon: Star, color: 'text-primary' },
            { label: 'Regional', count: regional.length, icon: ArrowRight, color: 'text-warning' },
            { label: 'Global', count: global.length, icon: Trophy, color: 'text-success' },
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

        {/* National Winners by Country */}
        <h2 className="font-display text-xl font-bold mb-4">National Stage — Scored Submissions</h2>
        {Object.keys(nationalByCountry).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8">
            <p className="text-muted-foreground">No scored national-stage submissions yet.</p>
          </Card>
        ) : (
          Object.entries(nationalByCountry).map(([country, subs]) => (
            <Card key={country} className="glass-card mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg">{country}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Rank</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(subs as any[]).map((sub: any, i: number) => (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell className="font-bold">{i + 1}</TableCell>
                        <TableCell className="font-medium">{sub.school_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {sub.award_categories?.slice(0, 1).map((c: string) => (
                              <Badge key={c} variant="outline" className="text-[10px] border-border">{c.split(' ').slice(0, 3).join(' ')}…</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className={`font-bold ${scoreColor(sub.avgScore)}`}>
                          {sub.avgScore ?? 'N/A'}/100
                        </TableCell>
                        <TableCell>
                          <Badge className={`${sub.status === 'winner' ? 'bg-success/20 text-success' : 'bg-secondary text-muted-foreground'} border-0 text-xs`}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.status !== 'winner' && sub.avgScore >= 80 && (
                            <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => promoteToRegional(sub.id)} disabled={promoting === sub.id}>
                              <ArrowRight className="h-3 w-3" /> {promoting === sub.id ? 'Promoting...' : 'Promote to Regional'}
                            </Button>
                          )}
                          {sub.status !== 'winner' && sub.avgScore && sub.avgScore < 80 && (
                            <span className="text-xs text-muted-foreground">Below 80 threshold</span>
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

        {/* Regional submissions */}
        {regional.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-4 mt-8">Regional Stage</h2>
            <Card className="glass-card mb-8">
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
                  {regional.map(sub => {
                    const avg = getAvgScore(sub.id);
                    return (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell className="font-medium">{sub.school_name}</TableCell>
                        <TableCell>{sub.school_country}</TableCell>
                        <TableCell className={`font-bold ${scoreColor(avg)}`}>{avg ?? 'Pending'}/100</TableCell>
                        <TableCell><Badge className={`${stageColor('regional')} border-0 text-xs`}>{sub.status}</Badge></TableCell>
                        <TableCell className="text-right">
                          {sub.status === 'scored' && avg && avg >= 80 && (
                            <Button size="sm" className="bg-gradient-gold gap-1" onClick={() => promoteToGlobal(sub.id)} disabled={promoting === sub.id}>
                              <Trophy className="h-3 w-3" /> Promote to Global
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </>
        )}

        {/* Global */}
        {global.length > 0 && (
          <>
            <h2 className="font-display text-xl font-bold mb-4 mt-8">Global Stage</h2>
            <Card className="glass-card">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>School</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Avg Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {global.map(sub => {
                    const avg = getAvgScore(sub.id);
                    return (
                      <TableRow key={sub.id} className="border-border">
                        <TableCell className="font-medium">{sub.school_name}</TableCell>
                        <TableCell>{sub.school_country}</TableCell>
                        <TableCell className={`font-bold ${scoreColor(avg)}`}>{avg ?? 'Pending'}/100</TableCell>
                        <TableCell><Badge className={`${stageColor('global')} border-0 text-xs`}>{sub.status}</Badge></TableCell>
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
