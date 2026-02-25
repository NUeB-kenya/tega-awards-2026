import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SecretariatScores() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, submissions(school_name, school_country)')
        .order('created_at', { ascending: false });
      
      if (data?.length) {
        const judgeIds = [...new Set(data.map(s => s.judge_id))];
        const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', judgeIds);
        const profileMap: Record<string, string> = {};
        profiles?.forEach(p => { profileMap[p.user_id] = p.full_name; });
        data.forEach(s => { (s as any).judge_name = profileMap[s.judge_id] || 'Unknown'; });
      }
      setScores(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold">All <span className="text-gradient-gold">Scores</span></h1>
        <p className="mb-8 text-muted-foreground">Complete scoring overview — Prestige Rubric (Impact 30%, Innovation 15%, Scalability 15%, Equity 10%, Sustainability 10%, Evidence 10%, Ethics 10%)</p>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>School</TableHead>
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
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : scores.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground">No scores yet</TableCell></TableRow>
              ) : scores.map(s => {
                const overall = s.overall_score || 0;
                const band = overall >= 90 ? '🏆 World-class' : overall >= 80 ? '⭐ Exceptional' : overall >= 70 ? '✓ Strong' : overall >= 60 ? '○ Promising' : '✗ Insufficient';
                return (
                  <TableRow key={s.id} className="border-border">
                    <TableCell className="font-medium">{(s.submissions as any)?.school_name || 'N/A'}</TableCell>
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
      </div>
    </DashboardLayout>
  );
}
