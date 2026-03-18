import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Map, RefreshCw, Trophy } from 'lucide-react';

const PASSMARK = 80;

export default function RegionalRankings() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase
      .from('application_rankings')
      .select('*, submissions(school_name, school_country, award_categories)')
      .not('regional_rank', 'is', null)
      .order('regional_rank', { ascending: true });
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

  const regionsList = [...new Set(rankings.map(r => r.region_id).filter(Boolean))].sort();
  const categoriesList = [...new Set(rankings.map(r => (r.submissions?.award_categories || []).flat()).flat().filter(Boolean))].sort();

  let filtered = filterRegion === 'all' ? rankings : rankings.filter(r => r.region_id === filterRegion);
  if (filterCategory !== 'all') {
    filtered = filtered.filter(r => (r.submissions?.award_categories || []).includes(filterCategory));
  }

  // Separate qualifiers from below-passmark
  const qualifiedFiltered = filtered.filter(r => (r.final_score || 0) >= PASSMARK);
  const belowPassmark = filtered.filter(r => (r.final_score || 0) < PASSMARK);

  // Group qualifiers by region then by category
  const byRegion: Record<string, any[]> = {};
  qualifiedFiltered.forEach(r => {
    const region = r.region_id || 'Unknown';
    if (!byRegion[region]) byRegion[region] = [];
    byRegion[region].push(r);
  });
  Object.values(byRegion).forEach(arr => arr.sort((a, b) => (b.final_score || 0) - (a.final_score || 0)));

  const tierBadge = (rank: number) => {
    if (rank <= 3) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs gap-1"><Trophy className="h-3 w-3" />Top 3</Badge>;
    if (rank <= 10) return <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Top 10</Badge>;
    if (rank <= 50) return <Badge className="bg-muted text-muted-foreground border-border text-xs">Top 50</Badge>;
    return <Badge variant="outline" className="text-xs border-border">#{rank}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Map className="h-7 w-7 text-warning" />
            <h1 className="font-display text-3xl font-bold">Regional <span className="text-gradient-gold">Rankings</span></h1>
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
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="w-[250px] bg-secondary border-border">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {regionsList.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={recalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Recalculating...' : 'Recalculate'}
            </Button>
          </div>
        </div>
        <p className="mb-8 text-muted-foreground">
          Top 3 from each country advance here (e.g., East Africa, West Africa). Rankings are <strong>per category</strong>. Only scores <strong>≥{PASSMARK}/100</strong> qualify. These feed into Continental rankings.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-warning">{Object.keys(byRegion).length}</p>
              <p className="text-xs text-muted-foreground">Regions</p>
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
              <p className="text-3xl font-bold text-amber-400">{qualifiedFiltered.filter(r => (r.regional_rank || 999) <= 3).length}</p>
              <p className="text-xs text-muted-foreground">Regional Top 3</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">Loading rankings...</p></Card>
        ) : Object.keys(byRegion).length === 0 && belowPassmark.length === 0 ? (
          <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No regional rankings yet. Run Recalculate from the Routing Engine.</p></Card>
        ) : (
          <>
            {Object.entries(byRegion).sort(([a], [b]) => a.localeCompare(b)).map(([region, entries]) => (
              <Card key={region} className="glass-card mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <Map className="h-4 w-4 text-warning" />
                    {region}
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
                      {entries.slice(0, 50).map((r: any, idx: number) => (
                        <TableRow key={r.id} className={`border-border ${idx < 3 ? 'bg-amber-500/5' : ''}`}>
                          <TableCell className="font-bold text-lg">#{r.regional_rank}</TableCell>
                          <TableCell className="font-medium">{r.submissions?.school_name || 'Unknown'}</TableCell>
                          <TableCell>{r.submissions?.school_country || 'Unknown'}</TableCell>
                          <TableCell className="text-xs">
                            {(r.submissions?.award_categories || []).slice(0, 2).map((c: string) => (
                              <Badge key={c} variant="outline" className="mr-1 text-xs">{c}</Badge>
                            ))}
                          </TableCell>
                          <TableCell className="font-bold text-primary">{r.final_score?.toFixed(1)}</TableCell>
                          <TableCell>{tierBadge(r.regional_rank || 999)}</TableCell>
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
