import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Flag, RefreshCw, Trophy, Medal } from 'lucide-react';

export default function NationalRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const { toast } = useToast();

  const fetchData = async () => {
    const [rankRes, subRes] = await Promise.all([
      supabase.from('application_rankings').select('*, submissions(school_name, school_country, award_categories, stage, status)').not('country_rank', 'is', null).order('country_rank', { ascending: true }),
      supabase.from('submissions').select('id, school_name, school_country, country_id'),
    ]);
    setRankings(rankRes.data || []);
    setSubmissions(subRes.data || []);
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

  const countries = [...new Set(rankings.map(r => r.submissions?.school_country).filter(Boolean))].sort();

  const filtered = filterCountry === 'all' ? rankings : rankings.filter(r => r.submissions?.school_country === filterCountry);

  // Group by country
  const byCountry: Record<string, any[]> = {};
  filtered.forEach(r => {
    const country = r.submissions?.school_country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(r);
  });
  Object.values(byCountry).forEach(arr => arr.sort((a, b) => (a.country_rank || 999) - (b.country_rank || 999)));

  const tierBadge = (rank: number) => {
    if (rank <= 3) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1"><Trophy className="h-3 w-3" />Top 3</Badge>;
    if (rank <= 10) return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Top 10</Badge>;
    return <Badge variant="outline" className="text-xs border-border">#{rank}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Flag className="h-7 w-7 text-primary" />
            <h1 className="font-display text-3xl font-bold">National <span className="text-gradient-gold">Rankings</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[220px] bg-secondary border-border">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          Every country's scored submissions ranked from #1 to the last. <strong>Top 3 per country</strong> are auto-promoted to Regional stage.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{Object.keys(byCountry).length}</p>
              <p className="text-xs text-muted-foreground">Countries</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">Total Ranked</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-amber-400">{filtered.filter(r => (r.country_rank || 999) <= 3).length}</p>
              <p className="text-xs text-muted-foreground">Promoted to Regional</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">Loading rankings...</p></Card>
        ) : Object.keys(byCountry).length === 0 ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No national rankings yet. Click Recalculate to generate.</p></Card>
        ) : (
          Object.entries(byCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, entries]) => (
            <Card key={country} className="glass-card mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Flag className="h-4 w-4 text-primary" />
                  {country}
                  <Badge variant="outline" className="ml-2 text-xs">{entries.length} entries</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Rank</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((r: any) => (
                      <TableRow key={r.id} className={`border-border ${(r.country_rank || 999) <= 3 ? 'bg-amber-500/5' : ''}`}>
                        <TableCell className="font-bold text-lg">#{r.country_rank}</TableCell>
                        <TableCell className="font-medium">{r.submissions?.school_name || 'Unknown'}</TableCell>
                        <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                        <TableCell>{tierBadge(r.country_rank || 999)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  );
}
