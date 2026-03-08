import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Globe, RefreshCw, Trophy, Medal, Award } from 'lucide-react';

export default function GlobalRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories)')
      .not('global_rank', 'is', null)
      .order('global_rank', { ascending: true });
    setRankings(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const recalculate = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-rankings');
      if (error) throw error;
      toast({ title: `Rankings recalculated: ${data?.ranked || 0} entries` });
      fetchData();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setRecalculating(false);
  };

  const tierBadge = (rank: number, tier: string) => {
    if (tier === 'gold' || rank <= 3) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1"><Trophy className="h-3 w-3" />🥇 Gold</Badge>;
    if (tier === 'silver' || rank <= 10) return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs gap-1"><Medal className="h-3 w-3" />🥈 Silver</Badge>;
    if (tier === 'bronze' || rank <= 24) return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs gap-1"><Award className="h-3 w-3" />🥉 Bronze</Badge>;
    return <Badge variant="outline" className="text-xs border-border">#{rank}</Badge>;
  };

  const tierRowStyle = (tier: string) => {
    if (tier === 'gold') return 'bg-amber-500/5';
    if (tier === 'silver') return 'bg-primary/5';
    if (tier === 'bronze') return 'bg-orange-500/5';
    return '';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Globe className="h-7 w-7 text-success" />
            <h1 className="font-display text-3xl font-bold">Global <span className="text-gradient-gold">Rankings</span></h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
            <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate'}
          </Button>
        </div>
        <p className="mb-8 text-muted-foreground">
          All continental qualifiers collected and ranked globally from #1 to the last entry. <strong>Gold (Top 3)</strong> · <strong>Silver (Top 10)</strong> · <strong>Bronze (Top 24)</strong>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-success">{rankings.length}</p>
              <p className="text-xs text-muted-foreground">Global Entries</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-amber-400">{rankings.filter(r => r.tier_level === 'gold').length}</p>
              <p className="text-xs text-muted-foreground">🥇 Gold</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{rankings.filter(r => r.tier_level === 'silver').length}</p>
              <p className="text-xs text-muted-foreground">🥈 Silver</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-orange-400">{rankings.filter(r => r.tier_level === 'bronze').length}</p>
              <p className="text-xs text-muted-foreground">🥉 Bronze</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">Loading global rankings...</p></Card>
        ) : rankings.length === 0 ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No global rankings yet. Run Recalculate from the Routing Engine.</p></Card>
        ) : (
          <Card className="glass-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Global Rank</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map(r => (
                  <TableRow key={r.id} className={`border-border ${tierRowStyle(r.tier_level)}`}>
                    <TableCell className="font-bold text-lg">#{r.global_rank}</TableCell>
                    <TableCell className="font-medium">{r.submissions?.school_name || 'Unknown'}</TableCell>
                    <TableCell>{r.submissions?.school_country || 'Unknown'}</TableCell>
                    <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                    <TableCell>{tierBadge(r.global_rank || 999, r.tier_level)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
