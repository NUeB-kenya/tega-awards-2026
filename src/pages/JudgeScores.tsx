import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function JudgeScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, submissions(school_name, school_country)')
        .eq('judge_id', user.id)
        .order('created_at', { ascending: false });
      setScores(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">
          My <span className="text-gradient-gold">Scores</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Review all scores you&apos;ve given</p>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>School</TableHead>
                <TableHead>Impact (30%)</TableHead>
                <TableHead>Innovation (15%)</TableHead>
                <TableHead>Scalability (15%)</TableHead>
                <TableHead>Equity (10%)</TableHead>
                <TableHead>Sustainability (10%)</TableHead>
                <TableHead>Evidence (10%)</TableHead>
                <TableHead>Ethics (10%)</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : scores.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No scores yet</TableCell></TableRow>
              ) : scores.map((score) => (
                <TableRow key={score.id} className="border-border">
                  <TableCell className="font-medium">{(score.submissions as any)?.school_name || 'N/A'}</TableCell>
                  <TableCell>{score.impact_score}</TableCell>
                  <TableCell>{score.innovation_score}</TableCell>
                  <TableCell>{score.scalability_score}</TableCell>
                  <TableCell>{score.criterion_equity ?? '-'}</TableCell>
                  <TableCell>{score.sustainability_score}</TableCell>
                  <TableCell>{score.criterion_evidence ?? '-'}</TableCell>
                  <TableCell>{score.criterion_ethics ?? '-'}</TableCell>
                  <TableCell className="font-semibold text-primary">{score.overall_score}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(score.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
