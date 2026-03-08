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

  const scoredSubIds = new Set(scores.map(s => s.submission_id));
  const national = submissions.filter(s => (s.stage || 'national') === 'national' && ['scored', 'winner', 'finalist'].includes(s.status) && (scoredSubIds.has(s.id) || s.average_score != null));
  const regional = submissions.filter(s => s.stage === 'regional').sort((a, b) => (getAvgScore(b.id) || 0) - (getAvgScore(a.id) || 0));
  const continental = submissions.filter(s => s.stage === 'continental').sort((a, b) => (getAvgScore(b.id) || 0) - (getAvgScore(a.id) || 0));
  const globalSubs = submissions.filter(s => s.stage === 'global').sort((a, b) => (getAvgScore(b.id) || 0) - (getAvgScore(a.id) || 0));
  const winners = submissions.filter(s => s.status === 'winner');

  // National grouped by country
  const nationalByCountry: Record<string, any[]> = {};
  national.forEach(s => {
    const country = s.school_country || 'Unknown';
    if (!nationalByCountry[country]) nationalByCountry[country] = [];
    nationalByCountry[country].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  Object.values(nationalByCountry).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  // Regional grouped by region name
  const regionalByRegion: Record<string, any[]> = {};
  regional.forEach(s => {
    const region = s.region || 'Unknown Region';
    if (!regionalByRegion[region]) regionalByRegion[region] = [];
    regionalByRegion[region].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  Object.values(regionalByRegion).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  // Continental grouped by continent
  const continentalByContinent: Record<string, any[]> = {};
  continental.forEach(s => {
    // Derive continent from region name
    const region = (s.region || '').toLowerCase();
    let continent = 'Unknown';
    if (region.includes('africa')) continent = 'Africa';
    else if (region.includes('europe')) continent = 'Europe';
    else if (region.includes('asia') || region.includes('pacific')) continent = 'Asia-Pacific';
    else if (region.includes('america') || region.includes('caribbean')) continent = 'Americas';
    else if (region.includes('middle east')) continent = 'Middle East';
    if (!continentalByContinent[continent]) continentalByContinent[continent] = [];
    continentalByContinent[continent].push({ ...s, avgScore: getAvgScore(s.id) });
  });
  Object.values(continentalByContinent).forEach(arr => arr.sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0)));

  // Global: single flat list, already sorted
  const globalWithScores = globalSubs.map(s => ({ ...s, avgScore: getAvgScore(s.id) }));

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
      if (allSelected) eligible.forEach(id => stageSet.delete(id));
      else eligible.forEach(id => stageSet.add(id));
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

  // Declare winners dialog for a grouped section
  const renderDeclareButton = (stageKey: string, subs: any[], label: string) => {
    const stageSelected = selectedWinners[stageKey] || new Set<string>();
    const eligible = subs.filter(s => s.status !== 'winner');
    const selectedCount = eligible.filter(s => stageSelected.has(s.id)).length;
    if (eligible.length === 0) return null;

    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="bg-gradient-gold gap-2" disabled={selectedCount === 0 || declaring}>
            <Award className="h-4 w-4" />
            Declare {selectedCount > 0 ? `${selectedCount} ` : ''}Winner{selectedCount !== 1 ? 's' : ''}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🏆 Declare Winners — {label}</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to officially declare <strong>{selectedCount} submission{selectedCount !== 1 ? 's' : ''}</strong> as winners from <strong>{label}</strong>.
              <br /><br />
              Each winner will be notified via in-app notification and email. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-gradient-gold" onClick={() => declareWinners(stageKey)}>
              {declaring ? 'Declaring...' : 'Confirm & Declare'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Grouped card with table for a set of submissions
  const renderGroupedCard = (groupName: string, subs: any[], stageKey: string, showCountry = true) => {
    const stageSelected = selectedWinners[stageKey] || new Set<string>();
    const eligible = subs.filter(s => s.status !== 'winner');

    return (
      <Card key={groupName} className="glass-card mb-4">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            {groupName}
            <Badge variant="outline" className="ml-2 text-xs">{subs.length} entries</Badge>
          </CardTitle>
          {renderDeclareButton(stageKey, subs, groupName)}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="w-10">
                  {eligible.length > 0 && (
                    <Checkbox
                      checked={eligible.length > 0 && eligible.every(s => stageSelected.has(s.id))}
                      onCheckedChange={() => selectAllForStage(stageKey, subs)}
                    />
                  )}
                </TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>School</TableHead>
                {showCountry && <TableHead>Country</TableHead>}
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow><TableCell colSpan={showCountry ? 6 : 5} className="text-center text-muted-foreground">No submissions</TableCell></TableRow>
              ) : subs.map((sub: any, i: number) => {
                const isWinner = sub.status === 'winner';
                return (
                  <TableRow key={sub.id} className={`border-border ${i < 3 ? 'bg-success/5' : ''} ${isWinner ? 'bg-success/10' : ''}`}>
                    <TableCell>
                      {!isWinner ? (
                        <Checkbox checked={stageSelected.has(sub.id)} onCheckedChange={() => toggleWinnerSelection(stageKey, sub.id)} />
                      ) : (
                        <Trophy className="h-4 w-4 text-success" />
                      )}
                    </TableCell>
                    <TableCell className="font-bold">
                      {i + 1}
                      {i < 3 && <span className="ml-1 text-success text-xs">★</span>}
                    </TableCell>
                    <TableCell className="font-medium">{sub.school_name}</TableCell>
                    {showCountry && <TableCell>{sub.school_country}</TableCell>}
                    <TableCell className={`font-bold ${scoreColor(sub.avgScore)}`}>{sub.avgScore != null ? sub.avgScore : '—'}</TableCell>
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
          Rankings are computed live. Top 3 per country → Regional (by region e.g. East Africa) → Continental (by continent) → Global. Click <strong>Recalculate & Auto-Promote</strong> to rank and promote winners automatically.
        </p>

        {/* Summary cards */}
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

        {/* ===== NATIONAL: by Country ===== */}
        <h2 className="font-display text-xl font-bold mb-4">🏠 National Stage — by Country</h2>
        {Object.keys(nationalByCountry).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No scored national-stage submissions yet.</p></Card>
        ) : (
          Object.entries(nationalByCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, subs]) =>
            renderGroupedCard(country, subs, `national_${country}`, false)
          )
        )}

        {/* ===== REGIONAL: by Region (East Africa, West Africa, etc.) ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Map className="h-5 w-5 text-warning" /> Regional Stage — by Region
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Top 3 from each country are promoted here, grouped by their region (e.g. East Africa, West Africa, Southern Europe).</p>
        {Object.keys(regionalByRegion).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No regional-stage submissions yet. Run Recalculate to promote top 3 from each country.</p></Card>
        ) : (
          Object.entries(regionalByRegion).sort(([a], [b]) => a.localeCompare(b)).map(([region, subs]) =>
            renderGroupedCard(region, subs, `regional_${region}`, true)
          )
        )}

        {/* ===== CONTINENTAL: by Continent ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> Continental Stage — by Continent
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Top 50 from each region are promoted here, grouped by continent. Ranked 1 to 100.</p>
        {Object.keys(continentalByContinent).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No continental-stage submissions yet. Run Recalculate to promote regional qualifiers.</p></Card>
        ) : (
          Object.entries(continentalByContinent).sort(([a], [b]) => a.localeCompare(b)).map(([continent, subs]) =>
            renderGroupedCard(continent, subs, `continental_${continent}`, true)
          )
        )}

        {/* ===== GLOBAL: single unified list ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-success" /> Global Stage — All Finalists
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Top 100 from each continent feed into the global pool, ranked from #1 (highest score) to last.</p>
        {globalWithScores.length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No global-stage submissions yet. Run Recalculate to promote continental qualifiers.</p></Card>
        ) : (
          renderGroupedCard('Global Finalists', globalWithScores, 'global', true)
        )}
      </div>
    </DashboardLayout>
  );
}
