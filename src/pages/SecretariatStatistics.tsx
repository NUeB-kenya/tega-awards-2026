import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function SecretariatStatistics() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [countries, setCountries] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [subsRes, countriesRes] = await Promise.all([
        supabase.from('submissions').select('id, school_name, school_country, nominator_name, average_score, status, stage, award_categories').order('school_name'),
        supabase.from('countries').select('name, flag_emoji'),
      ]);
      setSubmissions(subsRes.data || []);
      const flagMap: Record<string, string> = {};
      countriesRes.data?.forEach(c => { flagMap[c.name] = c.flag_emoji || ''; });
      setCountries(flagMap);
      setLoading(false);
    };
    fetch();
  }, []);

  // Sort A-Z by school name, include all (even ungraded with avg=null shown as 0)
  const sorted = [...submissions].sort((a, b) => (a.school_name || '').localeCompare(b.school_name || ''));
  const filtered = search ? sorted.filter(s => 
    s.school_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.nominator_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.school_country?.toLowerCase().includes(search.toLowerCase())
  ) : sorted;

  if (loading) return <DashboardLayout><p className="text-muted-foreground p-8">Loading...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">All <span className="text-gradient-gold">Applicants</span> (A–Z)</h1>
        <p className="mb-4 text-muted-foreground">Complete list of all applicants sorted alphabetically with average scores. Ungraded entries show 0.</p>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, school, or country..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
          </div>
          <Badge variant="outline" className="border-border">{filtered.length} entries</Badge>
        </div>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>#</TableHead>
                <TableHead>School / Applicant</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s, idx) => {
                const flag = countries[s.school_country] || '';
                const avg = s.average_score != null ? Number(s.average_score).toFixed(1) : '0.0';
                const scoreColor = Number(avg) >= 80 ? 'text-success' : Number(avg) >= 60 ? 'text-warning' : 'text-muted-foreground';
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{s.school_name}</p>
                      <p className="text-xs text-muted-foreground">{s.nominator_name}</p>
                    </TableCell>
                    <TableCell className="text-sm">{flag} {s.school_country}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(s.award_categories || []).slice(0, 2).map((c: string) => (
                          <Badge key={c} variant="outline" className="text-[9px] border-border">{c.split(' ').slice(0, 3).join(' ')}…</Badge>
                        ))}
                        {(s.award_categories || []).length > 2 && <Badge variant="outline" className="text-[9px] border-border">+{s.award_categories.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className={`font-bold ${scoreColor}`}>{avg}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 text-xs ${s.status === 'winner' ? 'bg-amber-500/20 text-amber-400' : s.status === 'scored' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{s.stage || 'national'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
