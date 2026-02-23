import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SecretariatScores() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('scores')
        .select('*, submissions(school_name, school_country)')
        .order('created_at', { ascending: false });
      
      // Fetch judge profiles separately
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
        <p className="mb-8 text-muted-foreground">Complete scoring overview across all judges</p>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>School</TableHead>
                <TableHead>Judge</TableHead>
                <TableHead>Innovation</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Scalability</TableHead>
                <TableHead>Sustainability</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : scores.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No scores yet</TableCell></TableRow>
              ) : scores.map(s => (
                <TableRow key={s.id} className="border-border">
                  <TableCell className="font-medium">{(s.submissions as any)?.school_name || 'N/A'}</TableCell>
                  <TableCell>{(s as any).judge_name || 'N/A'}</TableCell>
                  <TableCell>{s.innovation_score}</TableCell>
                  <TableCell>{s.impact_score}</TableCell>
                  <TableCell>{s.scalability_score}</TableCell>
                  <TableCell>{s.sustainability_score}</TableCell>
                  <TableCell className="font-semibold text-primary">{s.overall_score}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
