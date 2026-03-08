import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Globe, Map, Flag, RefreshCw } from 'lucide-react';

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
  const { toast } = useToast();

  const fetchRankings = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories)')
      .order('final_score', { ascending: false });

    const enriched = (data || []).map((r: any) => ({
      ...r,
      school_name: r.submissions?.school_name || 'Unknown',
      school_country: r.submissions?.school_country || 'Unknown',
      category_name: r.submissions?.award_categories?.[0] || 'N/A',
    }));
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
    if (tier === 'gold') return 'bg-gradient-to-r from-yellow-600/20 to-amber-500/20 text-amber-400 font-bold';
    if (tier === 'silver') return 'bg-primary/15 text-primary font-semibold';
    if (tier === 'bronze') return 'bg-muted text-muted-foreground';
    return '';
  };

  const tierBadge = (tier: string) => {
    if (tier === 'gold') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">🏆 Top 3</Badge>;
    if (tier === 'silver') return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">⭐ Top 10</Badge>;
    if (tier === 'bronze') return <Badge className="bg-muted text-muted-foreground border-border text-xs">Top 24</Badge>;
    return <Badge variant="outline" className="text-xs border-border">Unranked</Badge>;
  };

  const renderTable = (items: Ranking[], rankKey: 'country_rank' | 'continental_rank' | 'regional_rank' | 'global_rank') => (
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
          {items.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No rankings yet</TableCell></TableRow>
          ) : items.map(r => (
            <TableRow key={r.id} className={`border-border ${tierStyle(r.tier_level)}`}>
              <TableCell className="font-bold text-lg">#{r[rankKey] || '-'}</TableCell>
              <TableCell className="font-medium">{r.school_name}</TableCell>
              <TableCell>{r.school_country}</TableCell>
              <TableCell className="text-xs">{r.category_name}</TableCell>
              <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
              <TableCell>{tierBadge(r.tier_level)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );

  const countryRankings = rankings.filter(r => r.country_rank).sort((a, b) => (a.country_rank || 0) - (b.country_rank || 0));
  const continentalRankings = rankings.filter(r => r.continental_rank).sort((a, b) => (a.continental_rank || 0) - (b.continental_rank || 0));
  const regionalRankings = rankings.filter(r => r.regional_rank).sort((a, b) => (a.regional_rank || 0) - (b.regional_rank || 0));
  const globalRankings = rankings.filter(r => r.global_rank).sort((a, b) => (a.global_rank || 0) - (b.global_rank || 0));

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-amber-400" />
            <h1 className="font-display text-3xl font-bold"><span className="text-gradient-gold">Rankings</span></h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
            <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate Rankings'}
          </Button>
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

        <Tabs defaultValue="global" className="space-y-4">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="global">🌍 Global</TabsTrigger>
            <TabsTrigger value="continental">Continental</TabsTrigger>
            <TabsTrigger value="regional">Regional</TabsTrigger>
            <TabsTrigger value="country">Country</TabsTrigger>
          </TabsList>
          <TabsContent value="global">{renderTable(globalRankings, 'global_rank')}</TabsContent>
          <TabsContent value="continental">{renderTable(continentalRankings, 'continental_rank')}</TabsContent>
          <TabsContent value="regional">{renderTable(regionalRankings, 'regional_rank')}</TabsContent>
          <TabsContent value="country">{renderTable(countryRankings, 'country_rank')}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
