import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function JudgeScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, submissions(school_name, school_country, status, stage, award_categories)')
        .eq('judge_id', user.id)
        .order('overall_score', { ascending: false });
      setScores(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  // Group scores by category
  const byCategory: Record<string, any[]> = {};
  scores.forEach(s => {
    const cat = s.category_name || 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(s);
  });

  // Sort categories by count (most scored first)
  const sortedCategories = Object.entries(byCategory).sort(([, a], [, b]) => b.length - a.length);

  // Group by submission for average view
  const bySubmission: Record<string, any[]> = {};
  scores.forEach(s => {
    if (!bySubmission[s.submission_id]) bySubmission[s.submission_id] = [];
    bySubmission[s.submission_id].push(s);
  });

  const submissionAverages = Object.entries(bySubmission).map(([subId, subScores]) => {
    const avg = subScores.reduce((a, s) => a + (s.overall_score || 0), 0) / subScores.length;
    const first = subScores[0];
    const sub = first.submissions as any;
    return {
      id: subId,
      school_name: sub?.school_name || 'N/A',
      school_country: sub?.school_country || '',
      status: sub?.status || '',
      stage: sub?.stage || 'national',
      avg: Math.round(avg * 10) / 10,
      categoriesScored: subScores.length,
    };
  }).sort((a, b) => b.avg - a.avg);

  const getStatusLabel = (status: string, stage: string) => {
    if (status === 'winner' || status === 'finalist') return `🏆 ${stage.charAt(0).toUpperCase() + stage.slice(1)} ${status}`;
    if (status === 'scored') return 'Scored';
    return status;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          My <span className="text-gradient-gold">Scores</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Review all scores you&apos;ve given — grouped by category with rankings</p>

        <Tabs defaultValue="by-category">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="by-category">By Category</TabsTrigger>
            <TabsTrigger value="by-average">By Average Score</TabsTrigger>
            <TabsTrigger value="all">All Scores</TabsTrigger>
          </TabsList>

          {/* By Category */}
          <TabsContent value="by-category">
            <div className="space-y-6">
              {sortedCategories.length === 0 && (
                <Card className="glass-card py-12 text-center"><p className="text-muted-foreground">No scores yet</p></Card>
              )}
              {sortedCategories.map(([cat, catScores]) => {
                const sorted = [...catScores].sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
                return (
                  <Card key={cat} className="glass-card">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="font-display text-base">{cat}</CardTitle>
                        <Badge variant="outline" className="border-border text-xs">{sorted.length} scored</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {sorted.map((score, idx) => {
                          const sub = score.submissions as any;
                          const rank = idx + 1;
                          const tierColor = rank <= 3 ? 'border-l-amber-500' : rank <= 10 ? 'border-l-primary' : 'border-l-border';
                          const statusLabel = getStatusLabel(sub?.status || '', sub?.stage || 'national');
                          return (
                            <div key={score.id} className={`bg-secondary/50 rounded-lg p-3 border-l-4 ${tierColor} flex items-center justify-between`}>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-muted-foreground w-6">#{rank}</span>
                                <div>
                                  <p className="text-sm font-semibold">{sub?.school_name || 'N/A'}</p>
                                  <p className="text-xs text-muted-foreground">{sub?.school_country}</p>
                                </div>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                {(sub?.status === 'winner' || sub?.status === 'finalist') && (
                                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">{statusLabel}</Badge>
                                )}
                                <span className="text-lg font-bold text-primary">{score.overall_score?.toFixed(1)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* By Average */}
          <TabsContent value="by-average">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Schools by Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {submissionAverages.map((item, idx) => {
                    const rank = idx + 1;
                    const tierColor = rank <= 3 ? 'border-l-amber-500' : rank <= 10 ? 'border-l-primary' : 'border-l-border';
                    const stageLabel = item.stage.charAt(0).toUpperCase() + item.stage.slice(1);
                    return (
                      <div key={item.id} className={`bg-secondary/50 rounded-lg p-3 border-l-4 ${tierColor} flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-muted-foreground w-6">#{rank}</span>
                          <div>
                            <p className="text-sm font-semibold">{item.school_name}</p>
                            <p className="text-xs text-muted-foreground">{item.school_country} · {item.categoriesScored} categories</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <Badge variant="outline" className="border-border text-[10px]">{stageLabel}</Badge>
                          {(item.status === 'winner' || item.status === 'finalist') && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">🏆 {stageLabel}</Badge>
                          )}
                          <span className="text-lg font-bold text-primary">{item.avg}/100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Scores Table */}
          <TabsContent value="all">
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>School</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Impact (30%)</TableHead>
                    <TableHead>Innovation (15%)</TableHead>
                    <TableHead>Scalability (15%)</TableHead>
                    <TableHead>Equity (10%)</TableHead>
                    <TableHead>Sustain. (10%)</TableHead>
                    <TableHead>Evidence (10%)</TableHead>
                    <TableHead>Ethics (10%)</TableHead>
                    <TableHead>Overall</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : scores.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No scores yet</TableCell></TableRow>
                  ) : scores.map((score) => (
                    <TableRow key={score.id} className="border-border">
                      <TableCell className="font-medium">{(score.submissions as any)?.school_name || 'N/A'}</TableCell>
                      <TableCell>
                        {score.category_name ? (
                          <Badge variant="outline" className="border-border text-[10px]">{score.category_name.length > 25 ? score.category_name.slice(0, 25) + '…' : score.category_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">General</span>
                        )}
                      </TableCell>
                      <TableCell>{score.impact_score}</TableCell>
                      <TableCell>{score.innovation_score}</TableCell>
                      <TableCell>{score.scalability_score}</TableCell>
                      <TableCell>{score.criterion_equity ?? '-'}</TableCell>
                      <TableCell>{score.sustainability_score}</TableCell>
                      <TableCell>{score.criterion_evidence ?? '-'}</TableCell>
                      <TableCell>{score.criterion_ethics ?? '-'}</TableCell>
                      <TableCell className="font-semibold text-primary">{score.overall_score}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{new Date(score.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
