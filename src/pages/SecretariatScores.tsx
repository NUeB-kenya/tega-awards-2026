import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Fixed category ordering
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

export default function SecretariatScores() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, submissions(school_name, school_country, award_categories)')
        .order('overall_score', { ascending: false });

      if (data?.length) {
        const judgeIds = [...new Set(data.map(s => s.judge_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', judgeIds);
        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });
        data.forEach(s => { (s as any).judge_name = profileMap[s.judge_id] || 'Unknown'; });

        const allCats = new Set<string>();
        data.forEach(s => { if (s.category_name) allCats.add(s.category_name); });
        // Sort categories by predefined order
        const sorted = [...allCats].sort((a, b) => {
          const ia = CATEGORY_ORDER.indexOf(a);
          const ib = CATEGORY_ORDER.indexOf(b);
          return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
        setCategories(sorted);
      }
      setScores(data || []);
      setLoading(false);
    };
    fetchScores();
  }, []);

  const filtered = filterCategory === 'all' ? scores : scores.filter(s => s.category_name === filterCategory);

  // Group by submission + category, sorted by category order then score desc
  const grouped: Record<string, any[]> = {};
  filtered.forEach(s => {
    const key = `${s.submission_id}::${s.category_name || 'general'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  // Sort grouped entries: by category order, then by average score descending
  const sortedGroups = Object.entries(grouped).sort(([, aScores], [, bScores]) => {
    const catA = aScores[0]?.category_name || '';
    const catB = bScores[0]?.category_name || '';
    const orderA = CATEGORY_ORDER.indexOf(catA);
    const orderB = CATEGORY_ORDER.indexOf(catB);
    const catCompare = (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    if (catCompare !== 0) return catCompare;
    const avgA = aScores.reduce((a: number, s: any) => a + (s.overall_score || 0), 0) / aScores.length;
    const avgB = bScores.reduce((a: number, s: any) => a + (s.overall_score || 0), 0) / bScores.length;
    return avgB - avgA;
  });

  // Compute rank within each category
  const categoryRanks: Record<string, number> = {};
  let currentCat = '';
  let currentRank = 0;
  sortedGroups.forEach(([key, groupScores]) => {
    const cat = groupScores[0]?.category_name || 'general';
    if (cat !== currentCat) {
      currentCat = cat;
      currentRank = 1;
    } else {
      currentRank++;
    }
    categoryRanks[key] = currentRank;
  });

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-3xl font-bold">All <span className="text-gradient-gold">Scores</span></h1>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[250px] bg-secondary border-border">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <p className="mb-8 text-muted-foreground">Per-category scoring overview — Impact 30%, Innovation 15%, Scalability 15%, Equity 10%, Sustainability 10%, Evidence 10%, Ethics 10%</p>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>School</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Judge</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Innovation</TableHead>
                <TableHead>Scalability</TableHead>
                <TableHead>Equity</TableHead>
                <TableHead>Sustainability</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Ethics</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground">No scores yet</TableCell></TableRow>
              ) : filtered.map(s => {
                const overall = s.overall_score || 0;
                const band = overall >= 90 ? '🏆 World-class' : overall >= 80 ? '⭐ Exceptional' : overall >= 70 ? '✓ Strong' : overall >= 60 ? '○ Promising' : '✗ Insufficient';
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="font-medium">{(s.submissions as any)?.school_name || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                        {s.category_name || 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell>{(s as any).judge_name || 'N/A'}</TableCell>
                    <TableCell>{s.impact_score}</TableCell>
                    <TableCell>{s.innovation_score}</TableCell>
                    <TableCell>{s.scalability_score}</TableCell>
                    <TableCell>{s.criterion_equity ?? '-'}</TableCell>
                    <TableCell>{s.sustainability_score}</TableCell>
                    <TableCell>{s.criterion_evidence ?? '-'}</TableCell>
                    <TableCell>{s.criterion_ethics ?? '-'}</TableCell>
                    <TableCell className="font-semibold text-primary">{overall}</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${overall >= 80 ? 'bg-success/20 text-success' : overall >= 60 ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'}`}>
                        {band}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Summary by Submission & Category - ranked */}
        <h2 className="font-display text-lg font-semibold mt-8 mb-4">Score Summary by Submission & Category</h2>
        <div className="space-y-3">
          {sortedGroups.map(([key, groupScores]) => {
            const first = groupScores[0];
            const avgOverall = groupScores.reduce((a: number, s: any) => a + (s.overall_score || 0), 0) / groupScores.length;
            const rank = categoryRanks[key];
            const tierColor = rank <= 3 ? 'border-l-amber-500' : rank <= 10 ? 'border-l-primary' : 'border-l-border';
            return (
              <Card key={key} className={`glass-card p-4 border-l-4 ${tierColor}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
                      <p className="font-semibold">{(first.submissions as any)?.school_name || 'N/A'}</p>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary text-[10px] mt-1">
                      {first.category_name || 'General'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">{groupScores.length} judge{groupScores.length > 1 ? 's' : ''}</p>
                    <p className="text-lg font-bold text-primary">{avgOverall.toFixed(1)}/100</p>
                    {rank <= 3 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">🏆 Top 3</Badge>}
                    {rank > 3 && rank <= 10 && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">⭐ Top 10</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
