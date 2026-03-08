import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Globe, Map, Flag, RefreshCw } from 'lucide-react';

const CATEGORY_ORDER = [
  'Global Transformational School of the Year',
  'Global Education Innovation of the Year',
  'Transformational Educator of the Year',
  'STEM & Future Skills Advancement',
  'AI & Data Innovation in Education',
  'Inclusive Learning & Special Needs Education',
  'EdTech for Low-Resource & Rural Education',
  'Sustainability & Climate Education',
  'Youth Education Changemaker',
  'Lifetime Contribution to Education Transformation',
  'Community & Parental Engagement in Education',
  'Early Childhood & Foundational Learning',
  'Vocational & Technical Skills Education',
  'Teacher Professional Development Innovation',
];

type Ranking = {
  id: string;
  submission_id: string;
  final_score: number;
  country_id: string | null;
  region_id: string | null;
  continent: string | null;
  country_rank: number | null;
  continental_rank: number | null;
  regional_rank: number | null;
  global_rank: number | null;
  tier_level: string;
  school_name?: string;
  school_country?: string;
  category_name?: string;
};

export default function Rankings() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const { toast } = useToast();

  const fetchRankings = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories)')
      .order('final_score', { ascending: false });

    if (!data) { setRankings([]); setLoading(false); return; }

    // We also need to figure out category_name for each ranking.
    // The edge function stores one ranking per submission+category.
    // Since we don't have category_name column in rankings, we derive it:
    // Group rankings by submission_id, and match with award_categories order.
    // Better approach: fetch scores to get category names for each ranking.
    const { data: scores } = await supabase
      .from('scores')
      .select('submission_id, category_name, overall_score');

    // Build a map: submission_id -> Set of category names that have scores
    const subCategoryMap: Record<string, string[]> = {};
    scores?.forEach(s => {
      if (!s.category_name) return;
      if (!subCategoryMap[s.submission_id]) subCategoryMap[s.submission_id] = [];
      if (!subCategoryMap[s.submission_id].includes(s.category_name)) {
        subCategoryMap[s.submission_id].push(s.category_name);
      }
    });

    // For each ranking entry, determine which category it represents
    // Rankings are one-per-submission-per-category from the edge function
    // We track which categories we've already assigned per submission
    const usedCategories: Record<string, Set<string>> = {};
    
    const enriched = data.map((r: any) => {
      const subId = r.submission_id;
      const allCats = r.submissions?.award_categories || [];
      const scoredCats = subCategoryMap[subId] || [];
      
      if (!usedCategories[subId]) usedCategories[subId] = new Set();
      
      // Find next unassigned category for this submission
      let catName = 'N/A';
      for (const cat of scoredCats) {
        if (!usedCategories[subId].has(cat)) {
          catName = cat;
          usedCategories[subId].add(cat);
          break;
        }
      }
      // Fallback to award_categories if scored cats didn't match
      if (catName === 'N/A') {
        for (const cat of allCats) {
          if (!usedCategories[subId].has(cat)) {
            catName = cat;
            usedCategories[subId].add(cat);
            break;
          }
        }
      }

      return {
        ...r,
        school_name: r.submissions?.school_name || 'Unknown',
        school_country: r.submissions?.school_country || 'Unknown',
        category_name: catName,
      };
    });

    setRankings(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchRankings(); }, []);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-rankings');
      if (error) throw error;
      toast({ title: `Rankings recalculated: ${data?.ranked || 0} entries` });
      fetchRankings();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setRecalculating(false);
  };

  const tierStyle = (tier: string) => {
    if (tier === 'gold') return 'bg-gradient-to-r from-amber-900/20 to-amber-700/20 font-bold';
    if (tier === 'silver') return 'bg-primary/10 font-semibold';
    if (tier === 'bronze') return 'bg-muted/50';
    return '';
  };

  const tierBadge = (tier: string) => {
    if (tier === 'gold') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">🏆 Top 3</Badge>;
    if (tier === 'silver') return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">⭐ Top 10</Badge>;
    if (tier === 'bronze') return <Badge className="bg-muted text-muted-foreground border-border text-xs">Top 24</Badge>;
    return <Badge variant="outline" className="text-xs border-border">Unranked</Badge>;
  };

  // Get unique categories from rankings
  const availableCategories = [...new Set(rankings.map(r => r.category_name).filter(Boolean))]
    .sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a!);
      const ib = CATEGORY_ORDER.indexOf(b!);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

  const filteredRankings = filterCategory === 'all' 
    ? rankings 
    : rankings.filter(r => r.category_name === filterCategory);

  const renderTable = (items: Ranking[], rankKey: 'country_rank' | 'continental_rank' | 'regional_rank' | 'global_rank') => {
    const withRank = items.filter(r => r[rankKey] != null && r[rankKey]! > 0);
    // Sort by category order then rank
    withRank.sort((a, b) => {
      const catA = CATEGORY_ORDER.indexOf(a.category_name || '');
      const catB = CATEGORY_ORDER.indexOf(b.category_name || '');
      const catCompare = (catA === -1 ? 999 : catA) - (catB === -1 ? 999 : catB);
      if (catCompare !== 0) return catCompare;
      return (a[rankKey] || 0) - (b[rankKey] || 0);
    });

    return (
      <Card className="glass-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Rank</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withRank.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No rankings at this level yet</TableCell></TableRow>
            ) : withRank.map(r => (
              <TableRow key={r.id} className={`border-border ${tierStyle(r.tier_level)}`}>
                <TableCell className="font-bold text-lg">#{r[rankKey]}</TableCell>
                <TableCell className="font-medium">{r.school_name}</TableCell>
                <TableCell>{r.school_country}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{r.category_name}</Badge>
                </TableCell>
                <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                <TableCell>{tierBadge(r.tier_level)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  const countryRankings = filteredRankings.filter(r => r.country_rank);
  const continentalRankings = filteredRankings.filter(r => r.continental_rank);
  const regionalRankings = filteredRankings.filter(r => r.regional_rank);
  const globalRankings = filteredRankings.filter(r => r.global_rank);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-400" />
            <h1 className="font-display text-3xl font-bold"><span className="text-gradient-gold">Rankings</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[250px] bg-secondary border-border">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          Country → Continental → Regional → Global · Final Score = 40% Judge + 20% Impact + 15% Integrity + 15% Innovation + 10% Evidence
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Country Rankings', value: countryRankings.length, icon: Flag, color: 'text-primary' },
            { label: 'Continental', value: continentalRankings.length, icon: Map, color: 'text-accent' },
            { label: 'Regional', value: regionalRankings.length, icon: Map, color: 'text-warning' },
            { label: 'Global', value: globalRankings.length, icon: Globe, color: 'text-success' },
          ].map(c => (
            <Card key={c.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <c.icon className={`h-6 w-6 mx-auto mb-1 ${c.color}`} />
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="country" className="space-y-4">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="country">🏳️ Country ({countryRankings.length})</TabsTrigger>
            <TabsTrigger value="continental">🌍 Continental ({continentalRankings.length})</TabsTrigger>
            <TabsTrigger value="regional">🗺️ Regional ({regionalRankings.length})</TabsTrigger>
            <TabsTrigger value="global">🏆 Global ({globalRankings.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="country">{renderTable(countryRankings, 'country_rank')}</TabsContent>
          <TabsContent value="continental">{renderTable(continentalRankings, 'continental_rank')}</TabsContent>
          <TabsContent value="regional">{renderTable(regionalRankings, 'regional_rank')}</TabsContent>
          <TabsContent value="global">{renderTable(globalRankings, 'global_rank')}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
