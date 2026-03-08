import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Trophy, Star, Map, Globe, Zap, RefreshCw, Award } from 'lucide-react';

export default function SecretariatRouting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, Set<string>>>({});

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

  // Get avg score: first from direct judge scores, then from stored average_score (carried from parent)
  const getAvgScore = (subId: string) => {
    const subScores = scores.filter(s => s.submission_id === subId);
    if (subScores.length > 0) {
      return Math.round(subScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / subScores.length * 10) / 10;
    }
    const sub = submissions.find(s => s.id === subId);
    if (sub?.average_score != null) return Math.round(sub.average_score * 10) / 10;
    if (sub?.parent_submission_id) {
      const parentScores = scores.filter(s => s.submission_id === sub.parent_submission_id);
      if (parentScores.length > 0) {
        return Math.round(parentScores.reduce((sum, s) => sum + (s.overall_score || 0), 0) / parentScores.length * 10) / 10;
      }
    }
    return null;
  };

  // Show national-stage submissions that have been scored or already promoted (winner/finalist)
  const scoredSubIds = new Set(scores.map(s => s.submission_id));
  const national = submissions.filter(s => (s.stage || 'national') === 'national' && ['scored', 'winner', 'finalist'].includes(s.status) && (scoredSubIds.has(s.id) || s.average_score != null));
  const continental = submissions.filter(s => s.stage === 'continental');
  const regional = submissions.filter(s => s.stage === 'regional');
  const globalSubs = submissions.filter(s => s.stage === 'global');
  const winners = submissions.filter(s => s.status === 'winner');

  const nationalByCountry: Record<string, any[]> = {};
  national.forEach(s => {
    const country = s.school_country || 'Unknown';
    if (!nationalByCountry[country]) nationalByCountry[country] = [];
    nationalByCountry[country].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  Object.values(nationalByCountry).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  const runRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-rankings');
      if (error) throw error;
      toast({
        title: 'Rankings recalculated',
        description: `${data?.ranked || 0} ranked, ${data?.promoted || 0} auto-promoted`,
      });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setRecalculating(false);
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

  const toggleWinnerSelection = (stage: string, subId: string) => {
    setSelectedWinners(prev => {
      const stageSet = new Set(prev[stage] || []);
      if (stageSet.has(subId)) stageSet.delete(subId);
      else stageSet.add(subId);
      return { ...prev, [stage]: stageSet };
    });
  };

  const selectAllForStage = (stage: string, subs: any[]) => {
    setSelectedWinners(prev => {
      const eligible = subs.filter(s => s.status !== 'winner').map(s => s.id);
      const stageSet = new Set(prev[stage] || []);
      const allSelected = eligible.every(id => stageSet.has(id));
      if (allSelected) {
        eligible.forEach(id => stageSet.delete(id));
      } else {
        eligible.forEach(id => stageSet.add(id));
      }
      return { ...prev, [stage]: stageSet };
    });
  };

  const declareWinners = async (stage: string) => {
    const ids = Array.from(selectedWinners[stage] || []);
    if (ids.length === 0) return;
    setDeclaring(true);
    try {
      const { data, error } = await supabase.functions.invoke('declare-winners', {
        body: { submission_ids: ids, stage },
      });
      if (error) throw error;
      toast({
        title: `🏆 ${data?.declared || 0} Winners Declared!`,
        description: `Winners at the ${stage} stage have been notified via in-app notification and email.`,
      });
      setSelectedWinners(prev => ({ ...prev, [stage]: new Set() }));
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error declaring winners', description: e.message, variant: 'destructive' });
    }
    setDeclaring(false);
  };

  const scoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-primary';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const stageBadge = (status: string) => {
    const colors: Record<string, string> = {
      scored: 'bg-primary/20 text-primary',
      winner: 'bg-success/20 text-success',
      submitted: 'bg-secondary text-muted-foreground',
      assigned: 'bg-warning/20 text-warning',
      finalist: 'bg-accent/20 text-accent',
    };
    return <Badge className={`${colors[status] || 'bg-secondary text-muted-foreground'} border-0 text-xs`}>{status}</Badge>;
  };

  const renderStageTable = (subs: any[], stageLabel: string, stageKey: string) => {
    const stageSelected = selectedWinners[stageKey] || new Set<string>();
    const eligibleForWinner = subs.filter(s => s.status !== 'winner');
    const selectedCount = eligibleForWinner.filter(s => stageSelected.has(s.id)).length;

    return (
      <Card className="glass-card mb-4 overflow-x-auto">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">{stageLabel}</CardTitle>
          {eligibleForWinner.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-gradient-gold gap-2"
                  disabled={selectedCount === 0 || declaring}
                >
                  <Award className="h-4 w-4" />
                  Declare {selectedCount > 0 ? `${selectedCount} ` : ''}Winner{selectedCount !== 1 ? 's' : ''}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>🏆 Declare Winners</AlertDialogTitle>
                  <AlertDialogDescription>
                    You are about to officially declare <strong>{selectedCount} submission{selectedCount !== 1 ? 's' : ''}</strong> as winners at the <strong>{stageLabel}</strong> stage.
                    <br /><br />
                    Each winner will receive:
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>An in-app notification announcing their win</li>
                      <li>An email with winner details and next steps</li>
                    </ul>
                    <br />
                    This action cannot be undone. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-gradient-gold"
                    onClick={() => declareWinners(stageKey)}
                  >
                    {declaring ? 'Declaring...' : 'Confirm & Declare Winners'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-10">
                  {eligibleForWinner.length > 0 && (
                    <Checkbox
                      checked={eligibleForWinner.length > 0 && eligibleForWinner.every(s => stageSelected.has(s.id))}
                      onCheckedChange={() => selectAllForStage(stageKey, subs)}
                    />
                  )}
                </TableHead>
                <TableHead>#</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No submissions at this stage yet</TableCell></TableRow>
              ) : subs.map((sub, i) => {
                const avg = getAvgScore(sub.id);
                const isWinner = sub.status === 'winner';
                return (
                  <TableRow key={sub.id} className={`border-border ${isWinner ? 'bg-success/5' : ''}`}>
                    <TableCell>
                      {!isWinner ? (
                        <Checkbox
                          checked={stageSelected.has(sub.id)}
                          onCheckedChange={() => toggleWinnerSelection(stageKey, sub.id)}
                        />
                      ) : (
                        <Trophy className="h-4 w-4 text-success" />
                      )}
                    </TableCell>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{sub.school_name}</TableCell>
                    <TableCell>{sub.school_country}</TableCell>
                    <TableCell className={`font-bold ${scoreColor(avg)}`}>{avg != null ? avg : '—'}</TableCell>
                    <TableCell>{stageBadge(sub.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="font-display text-3xl font-bold">Routing <span className="text-gradient-gold">Engine</span></h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={runAutoAllocate} disabled={allocating}>
              <Zap className={`h-4 w-4 ${allocating ? 'animate-spin' : ''}`} />
              {allocating ? 'Allocating...' : 'Auto-Allocate Judges'}
            </Button>
            <Button size="sm" className="bg-gradient-gold gap-2" onClick={runRecalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Calculating...' : 'Recalculate & Auto-Promote'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          Rankings are computed live. Top 3 per country → Regional → Continental → Global. Click <strong>Recalculate & Auto-Promote</strong> to rank all scored submissions and automatically promote winners at each tier. Use <strong>Declare Winners</strong> to officially announce winners at any stage.
        </p>

        {/* 4-tier summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'National (Scored)', count: national.length, icon: Star, color: 'text-primary' },
            { label: 'Regional', count: regional.length, icon: Map, color: 'text-warning' },
            { label: 'Continental', count: continental.length, icon: Globe, color: 'text-accent' },
            { label: 'Global', count: globalSubs.length, icon: Trophy, color: 'text-success' },
            { label: 'Winners', count: winners.length, icon: Trophy, color: 'text-success' },
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
        <h2 className="font-display text-xl font-bold mb-4">🏠 National Stage — Scored Submissions</h2>
        {Object.keys(nationalByCountry).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No scored national-stage submissions yet.</p></Card>
        ) : (
          Object.entries(nationalByCountry).map(([country, subs]) => {
            const stageKey = `national_${country}`;
            const stageSelected = selectedWinners[stageKey] || new Set<string>();
            const eligible = (subs as any[]).filter((s: any) => s.status !== 'winner');
            const selectedCount = eligible.filter((s: any) => stageSelected.has(s.id)).length;

            return (
              <Card key={country} className="glass-card mb-4">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">{country}</CardTitle>
                  {eligible.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-gradient-gold gap-2"
                          disabled={selectedCount === 0 || declaring}
                        >
                          <Award className="h-4 w-4" />
                          Declare {selectedCount > 0 ? `${selectedCount} ` : ''}Winner{selectedCount !== 1 ? 's' : ''}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>🏆 Declare National Winners — {country}</AlertDialogTitle>
                          <AlertDialogDescription>
                            You are about to officially declare <strong>{selectedCount} submission{selectedCount !== 1 ? 's' : ''}</strong> as national winners from <strong>{country}</strong>.
                            <br /><br />
                            Each winner will be notified via in-app notification and email. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-gradient-gold"
                            onClick={() => declareWinners(stageKey)}
                          >
                            {declaring ? 'Declaring...' : 'Confirm & Declare'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="w-10">
                          {eligible.length > 0 && (
                            <Checkbox
                              checked={eligible.length > 0 && eligible.every((s: any) => stageSelected.has(s.id))}
                              onCheckedChange={() => selectAllForStage(stageKey, subs as any[])}
                            />
                          )}
                        </TableHead>
                        <TableHead>Rank</TableHead><TableHead>School</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(subs as any[]).map((sub: any, i: number) => {
                        const isWinner = sub.status === 'winner';
                        return (
                          <TableRow key={sub.id} className={`border-border ${i < 3 ? 'bg-success/5' : ''} ${isWinner ? 'bg-success/10' : ''}`}>
                            <TableCell>
                              {!isWinner ? (
                                <Checkbox
                                  checked={stageSelected.has(sub.id)}
                                  onCheckedChange={() => toggleWinnerSelection(stageKey, sub.id)}
                                />
                              ) : (
                                <Trophy className="h-4 w-4 text-success" />
                              )}
                            </TableCell>
                            <TableCell className="font-bold">
                              {i + 1}
                              {i < 3 && <span className="ml-1 text-success text-xs">★</span>}
                            </TableCell>
                            <TableCell className="font-medium">{sub.school_name}</TableCell>
                            <TableCell className={`font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore != null ? sub.avgScore : '—'}</TableCell>
                            <TableCell>{stageBadge(sub.status)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {eligible.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">★ Top 3 auto-promoted to Regional on recalculation · Select entries and click <strong>Declare Winners</strong> to officially announce</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* Regional */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8">🗺️ Regional Stage</h2>
        {regional.length > 0
          ? renderStageTable(regional, 'Regional Submissions', 'regional')
          : <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No regional-stage submissions yet.</p></Card>
        }

        {/* Continental */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8">🌍 Continental Stage</h2>
        {continental.length > 0
          ? renderStageTable(continental, 'Continental Submissions', 'continental')
          : <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No continental-stage submissions yet.</p></Card>
        }

        {/* Global */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8">🌐 Global Stage</h2>
        {globalSubs.length > 0
          ? renderStageTable(globalSubs, 'Global Finalists', 'global')
          : <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No global-stage submissions yet.</p></Card>
        }
      </div>
    </DashboardLayout>
  );
}
