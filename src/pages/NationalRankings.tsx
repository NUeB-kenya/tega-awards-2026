import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Flag, RefreshCw, Trophy } from 'lucide-react';

const PASSMARK = 80;

export default function NationalRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories, stage, status, average_score)')
      .not('country_rank', 'is', null)
      .order('country_rank', { ascending: true });
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

  const countries = [...new Set(rankings.map(r => r.submissions?.school_country).filter(Boolean))].sort();
  const categories = [...new Set(rankings.map(r => {
    const cats = r.submissions?.award_categories || [];
    return cats;
  }).flat().filter(Boolean))].sort();

  let filtered = filterCountry === 'all' ? rankings : rankings.filter(r => r.submissions?.school_country === filterCountry);
  if (filterCategory !== 'all') {
    filtered = filtered.filter(r => (r.submissions?.award_categories || []).includes(filterCategory));
  }

  // Group by country
  const byCountry: Record<string, any[]> = {};
  filtered.forEach(r => {
    const country = r.submissions?.school_country || 'Unknown';
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(r);
  });
  Object.values(byCountry).forEach(arr => arr.sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0)));

  const tierBadge = (rank: number, score: number) => {
    if (score < PASSMARK) return <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">Below Passmark</Badge>;
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
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterCountry} onValueChange={setFilterCountry}>
              <SelectTrigger className="w-[180px] bg-secondary border-border">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[220px] bg-secondary border-border">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          Every country's scored submissions ranked by highest score. <strong>Top 3 per country</strong> (≥{PASSMARK}/100) are auto-promoted to Regional stage.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <p className="text-3xl font-bold text-amber-400">{filtered.filter(r => (r.country_rank || 999) <= 3 && (r.final_score || 0) >= PASSMARK).length}</p>
              <p className="text-xs text-muted-foreground">Promoted to Regional</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-muted-foreground">{filtered.filter(r => (r.final_score || 0) < PASSMARK).length}</p>
              <p className="text-xs text-muted-foreground">Below Passmark</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">Loading rankings...</p></Card>
        ) : Object.keys(byCountry).length === 0 ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No national rankings yet. Click Recalculate to generate.</p></Card>
        ) : (
          Object.entries(byCountry).sort(([a], [b]) => a.localeCompare(b)).map(([country, entries]) => {
            const qualifiers = entries.filter(r => (r.final_score || 0) >= PASSMARK);
            const others = entries.filter(r => (r.final_score || 0) < PASSMARK);

            return (
              <Card key={country} className="glass-card mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Flag className="h-4 w-4 text-primary" />
                    {country}
                    <Badge variant="outline" className="ml-2 text-xs">{entries.length} entries</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Qualifiers */}
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
                      {qualifiers.map((r: any, idx: number) => (
                        <TableRow key={r.id} className={`border-border ${idx < 3 ? 'bg-amber-500/5' : ''}`}>
                          <TableCell className="font-bold text-lg">#{idx + 1}</TableCell>
                          <TableCell className="font-medium">{r.submissions?.school_name || 'Unknown'}</TableCell>
                          <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                          <TableCell>{tierBadge(idx + 1, r.final_score || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Others - below passmark */}
                  {others.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                        Participants Below Qualifying Score ({PASSMARK}/100)
                      </p>
                      <Table>
                        <TableBody>
                          {others.map((r: any, idx: number) => (
                            <TableRow key={r.id} className="border-border opacity-60">
                              <TableCell className="font-bold text-sm text-muted-foreground">#{qualifiers.length + idx + 1}</TableCell>
                              <TableCell className="text-sm">{r.submissions?.school_name || 'Unknown'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.final_score?.toFixed(1)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">Below Passmark</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}
