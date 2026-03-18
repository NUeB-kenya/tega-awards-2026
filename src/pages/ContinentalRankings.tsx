import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Globe2, RefreshCw, Trophy } from 'lucide-react';

const PASSMARK = 80;

export default function ContinentalRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterContinent, setFilterContinent] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories)')
      .not('continental_rank', 'is', null)
      .order('continental_rank', { ascending: true });
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

  const continentsList = [...new Set(rankings.map(r => r.continent).filter(Boolean))].sort();
  const categoriesList = [...new Set(rankings.map(r => (r.submissions?.award_categories || []).flat()).flat().filter(Boolean))].sort();

  let filtered = filterContinent === 'all' ? rankings : rankings.filter(r => r.continent === filterContinent);
  if (filterCategory !== 'all') {
    filtered = filtered.filter(r => (r.submissions?.award_categories || []).includes(filterCategory));
  }

  const qualifiedFiltered = filtered.filter(r => (r.final_score || 0) >= PASSMARK);
  const belowPassmark = filtered.filter(r => (r.final_score || 0) < PASSMARK);

  const byContinent: Record<string, any[]> = {};
  qualifiedFiltered.forEach(r => {
    const cont = r.continent || 'Unknown';
    if (!byContinent[cont]) byContinent[cont] = [];
    byContinent[cont].push(r);
  });
  Object.values(byContinent).forEach(arr => arr.sort((a, b) => (b.final_score || 0) - (a.final_score || 0)));

  const tierBadge = (rank: number) => {
    if (rank <= 3) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1"><Trophy className="h-3 w-3" />Top 3</Badge>;
    if (rank <= 10) return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Top 10</Badge>;
    if (rank <= 50) return <Badge className="bg-muted text-muted-foreground border-border text-xs">Top 50</Badge>;
    if (rank <= 100) return <Badge variant="outline" className="text-xs border-border">Top 100</Badge>;
    return <Badge variant="outline" className="text-xs border-border">#{rank}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Globe2 className="h-7 w-7 text-accent" />
            <h1 className="font-display text-3xl font-bold">Continental <span className="text-gradient-gold">Rankings</span></h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[220px] bg-secondary border-border">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterContinent} onValueChange={setFilterContinent}>
              <SelectTrigger className="w-[220px] bg-secondary border-border">
                <SelectValue placeholder="Filter by continent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Continents</SelectItem>
                {continentsList.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          All regional qualifiers aggregated per continent and <strong>per category</strong>. Only scores <strong>≥{PASSMARK}/100</strong> qualify. Up to <strong>Top 100</strong> per continent feed into Global rankings.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-accent">{Object.keys(byContinent).length}</p>
              <p className="text-xs text-muted-foreground">Continents</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{qualifiedFiltered.length}</p>
              <p className="text-xs text-muted-foreground">Qualified (≥{PASSMARK})</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-amber-400">{qualifiedFiltered.filter(r => (r.continental_rank || 999) <= 10).length}</p>
              <p className="text-xs text-muted-foreground">Continental Top 10</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">Loading rankings...</p></Card>
        ) : Object.keys(byContinent).length === 0 && belowPassmark.length === 0 ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No continental rankings yet. Run Recalculate from the Routing Engine.</p></Card>
        ) : (
          <>
            {Object.entries(byContinent).sort(([a], [b]) => a.localeCompare(b)).map(([continent, entries]) => (
              <Card key={continent} className="glass-card mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-accent" />
                    {continent}
                    <Badge variant="outline" className="ml-2 text-xs">{entries.length} entries</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Rank</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.slice(0, 100).map((r: any) => (
                        <TableRow key={r.id} className={`border-border ${(r.continental_rank || 999) <= 3 ? 'bg-amber-500/5' : ''}`}>
                          <TableCell className="font-bold text-lg">#{r.continental_rank}</TableCell>
                          <TableCell className="font-medium">{r.submissions?.school_name || 'Unknown'}</TableCell>
                          <TableCell>{r.submissions?.school_country || 'Unknown'}</TableCell>
                          <TableCell className="text-xs">
                            {(r.submissions?.award_categories || []).slice(0, 2).map((c: string) => (
                              <Badge key={c} variant="outline" className="mr-1 text-xs">{c}</Badge>
                            ))}
                          </TableCell>
                          <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                          <TableCell>{tierBadge(r.continental_rank || 999)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}

            {belowPassmark.length > 0 && (
              <Card className="glass-card mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2 text-muted-foreground">
                    Participants Below Qualifying Score ({PASSMARK}/100)
                    <Badge variant="outline" className="ml-2 text-xs">{belowPassmark.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {belowPassmark.sort((a, b) => (b.final_score || 0) - (a.final_score || 0)).map((r: any) => (
                        <TableRow key={r.id} className="border-border opacity-60">
                          <TableCell className="text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-sm">{r.submissions?.school_name || 'Unknown'}</TableCell>
                          <TableCell className="text-sm">{r.submissions?.school_country || 'Unknown'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.final_score?.toFixed(1)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs border-muted-foreground text-muted-foreground">Below Passmark</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
