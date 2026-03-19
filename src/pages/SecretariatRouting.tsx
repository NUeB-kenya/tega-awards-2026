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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Trophy, Star, Map, Globe, Zap, RefreshCw, Award } from 'lucide-react';

type CategoryScore = {
  category_name: string;
  scores: number[];
  avg: number;
};

type SubWithCategories = {
  id: string;
  school_name: string;
  school_country: string;
  region: string | null;
  stage: string;
  status: string;
  award_categories: string[] | null;
  submitter_id: string;
  parent_submission_id: string | null;
  average_score: number | null;
  categoryScores: CategoryScore[];
  bestCategoryScore: number | null;
};

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
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  // Build per-category score breakdown for a submission
  const buildCategoryScores = (subId: string, sub: any): CategoryScore[] => {
    const subScores = scores.filter(s => s.submission_id === subId);
    
    // If this is a promoted entry with no direct scores, check parent
    if (subScores.length === 0 && sub?.parent_submission_id) {
      const parentScores = scores.filter(s => s.submission_id === sub.parent_submission_id);
      return buildCategoryScoresFromScores(parentScores, sub?.award_categories || []);
    }
    
    return buildCategoryScoresFromScores(subScores, sub?.award_categories || []);
  };

  const buildCategoryScoresFromScores = (subScores: any[], awardCategories: string[]): CategoryScore[] => {
    if (subScores.length === 0) return [];

    // Group scores by category_name
    const byCat: Record<string, number[]> = {};
    subScores.forEach(s => {
      const cat = s.category_name || 'General';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(s.overall_score || 0);
    });

    // Also include any award_categories that may not have scores yet
    (awardCategories || []).forEach(cat => {
      if (!byCat[cat]) byCat[cat] = [];
    });

    return Object.entries(byCat).map(([cat, vals]) => ({
      category_name: cat,
      scores: vals,
      avg: vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0,
    })).sort((a, b) => b.avg - a.avg);
  };

  const enrichSub = (sub: any): SubWithCategories => {
    const categoryScores = buildCategoryScores(sub.id, sub);
    const bestCategoryScore = categoryScores.length > 0 
      ? Math.max(...categoryScores.filter(c => c.scores.length > 0).map(c => c.avg), 0) 
      : sub.average_score;
    return { ...sub, categoryScores, bestCategoryScore };
  };

  // Collect all unique category names across all scored submissions
  const allCategories = Array.from(new Set(
    scores.map(s => s.category_name || 'General')
      .concat(submissions.flatMap(s => s.award_categories || []))
  )).filter(Boolean).sort();

  const scoredSubIds = new Set(scores.map(s => s.submission_id));

  const filterByCategory = (subs: SubWithCategories[]) => {
    if (activeCategory === 'all') return subs;
    // Only include entries that have actual scores for the filtered category
    return subs.filter(s => 
      s.categoryScores.some(c => c.category_name === activeCategory && c.scores.length > 0)
    );
  };

  const getCategoryScore = (sub: SubWithCategories): number | null => {
    if (activeCategory === 'all') {
      return sub.bestCategoryScore;
    }
    const catScore = sub.categoryScores.find(c => c.category_name === activeCategory);
    return catScore && catScore.scores.length > 0 ? catScore.avg : null;
  };


  const deduplicateBySchool = (subs: SubWithCategories[]): SubWithCategories[] => {
    if (activeCategory === 'all') return subs;
    const bySchool: Map<string, SubWithCategories> = new Map();
    subs.forEach(s => {
      const key = s.school_name.trim().toUpperCase();
      const existing = bySchool.get(key);
      const currentScore = getCategoryScore(s) || 0;
      const existingScore = existing ? (getCategoryScore(existing) || 0) : -1;
      if (!existing || currentScore > existingScore) {
        bySchool.set(key, s);
      }
    });
    return Array.from(bySchool.values());
  };

  const national = deduplicateBySchool(filterByCategory(
    submissions
      .filter(s => (s.stage || 'national') === 'national' && ['scored', 'winner', 'finalist'].includes(s.status) && (scoredSubIds.has(s.id) || s.average_score != null))
      .map(enrichSub)
  ));
  const regional = deduplicateBySchool(filterByCategory(submissions.filter(s => s.stage === 'regional').map(enrichSub)));
  const continental = deduplicateBySchool(filterByCategory(submissions.filter(s => s.stage === 'continental').map(enrichSub)));
  const globalSubs = deduplicateBySchool(filterByCategory(submissions.filter(s => s.stage === 'global').map(enrichSub)));
  const winners = submissions.filter(s => s.status === 'winner');

  // Sort by active category score
  const sortByCatScore = (a: SubWithCategories, b: SubWithCategories) => (getCategoryScore(b) || 0) - (getCategoryScore(a) || 0);

  // National grouped by country
  const nationalByCountry: Record<string, SubWithCategories[]> = {};
  national.forEach(s => {
    const country = s.school_country || 'Unknown';
    if (!nationalByCountry[country]) nationalByCountry[country] = [];
    nationalByCountry[country].push(s);
  });
  Object.values(nationalByCountry).forEach(arr => arr.sort(sortByCatScore));

  // Regional grouped by region name
  const regionalByRegion: Record<string, SubWithCategories[]> = {};
  regional.forEach(s => {
    const region = s.region || 'Unknown Region';
    if (!regionalByRegion[region]) regionalByRegion[region] = [];
    regionalByRegion[region].push(s);
  });
  Object.values(regionalByRegion).forEach(arr => arr.sort(sortByCatScore));

  // Continental grouped by continent
  const continentalByContinent: Record<string, SubWithCategories[]> = {};
  continental.forEach(s => {
    const region = (s.region || '').toLowerCase();
    let cont = 'Unknown';
    if (region.includes('africa')) cont = 'Africa';
    else if (region.includes('europe')) cont = 'Europe';
    else if (region.includes('asia') || region.includes('pacific')) cont = 'Asia-Pacific';
    else if (region.includes('america') || region.includes('caribbean')) cont = 'Americas';
    else if (region.includes('middle east')) cont = 'Middle East';
    if (!continentalByContinent[cont]) continentalByContinent[cont] = [];
    continentalByContinent[cont].push(s);
  });
  Object.values(continentalByContinent).forEach(arr => arr.sort(sortByCatScore));

  const globalWithScores = globalSubs.sort(sortByCatScore);

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

  const selectAllForStage = (stage: string, subs: SubWithCategories[]) => {
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

  const renderDeclareButton = (stageKey: string, subs: SubWithCategories[], label: string) => {
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
              You are about to officially declare <strong>{selectedCount} submission{selectedCount !== 1 ? 's' : ''}</strong> as winners from <strong>{label}</strong>
              {activeCategory !== 'all' && <> in category <strong>{activeCategory}</strong></>}.
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

  const renderGroupedCard = (groupName: string, subs: SubWithCategories[], stageKey: string, showCountry = true) => {
    const stageSelected = selectedWinners[stageKey] || new Set<string>();
    const eligible = subs.filter(s => s.status !== 'winner');
    const showingAllCategories = activeCategory === 'all';

    return (
      <Card key={groupName} className="glass-card mb-4">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            {groupName}
            <Badge variant="outline" className="ml-2 text-xs">{subs.length} entries</Badge>
          </CardTitle>
          {renderDeclareButton(stageKey, subs, groupName)}
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
                {showingAllCategories ? (
                  <TableHead>Category Scores</TableHead>
                ) : (
                  <TableHead>{activeCategory} Score</TableHead>
                )}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow><TableCell colSpan={showCountry ? 6 : 5} className="text-center text-muted-foreground">No submissions</TableCell></TableRow>
              ) : subs.map((sub, i) => {
                const isWinner = sub.status === 'winner';
                const catScore = getCategoryScore(sub);
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
                    <TableCell>
                      {showingAllCategories ? (
                        <div className="flex flex-col gap-1">
                          {sub.categoryScores.length > 0 ? sub.categoryScores.map(cs => (
                            <div key={cs.category_name} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 max-w-[160px] truncate">
                                {cs.category_name}
                              </Badge>
                              <span className={`font-bold ${scoreColor(cs.avg)}`}>
                                {cs.scores.length > 0 ? cs.avg : '—'}
                              </span>
                              {cs.scores.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({cs.scores.length} judge{cs.scores.length !== 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                          )) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      ) : (
                        <span className={`font-bold ${scoreColor(catScore)}`}>
                          {catScore != null ? catScore : '—'}
                        </span>
                      )}
                    </TableCell>
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
        <p className="mb-4 text-muted-foreground">
          Rankings are computed per category. Filter by category to see scores and declare winners for each award independently.
        </p>

        {/* Category filter tabs */}
        <div className="mb-6">
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs">All Categories</TabsTrigger>
              {allCategories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="text-xs max-w-[200px] truncate">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

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

        {/* ===== REGIONAL ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Map className="h-5 w-5 text-warning" /> Regional Stage — by Region
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Top 3 from each country are promoted here, grouped by region.</p>
        {Object.keys(regionalByRegion).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No regional-stage submissions yet.</p></Card>
        ) : (
          Object.entries(regionalByRegion).sort(([a], [b]) => a.localeCompare(b)).map(([region, subs]) =>
            renderGroupedCard(region, subs, `regional_${region}`, true)
          )
        )}

        {/* ===== CONTINENTAL ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> Continental Stage — by Continent
        </h2>
        <p className="text-sm text-muted-foreground mb-4">Top 50 from each region are promoted here.</p>
        {Object.keys(continentalByContinent).length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No continental-stage submissions yet.</p></Card>
        ) : (
          Object.entries(continentalByContinent).sort(([a], [b]) => a.localeCompare(b)).map(([continent, subs]) =>
            renderGroupedCard(continent, subs, `continental_${continent}`, true)
          )
        )}

        {/* ===== GLOBAL ===== */}
        <h2 className="font-display text-xl font-bold mb-4 mt-8 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-success" /> Global Stage — All Finalists
        </h2>
        {globalWithScores.length === 0 ? (
          <Card className="glass-card py-8 text-center mb-8"><p className="text-muted-foreground">No global-stage submissions yet.</p></Card>
        ) : (
          renderGroupedCard('Global Finalists', globalWithScores, 'global', true)
        )}
      </div>
    </DashboardLayout>
  );
}
