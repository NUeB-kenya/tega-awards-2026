import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SecretariatJudges() {
  const [judges, setJudges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'judge');
      if (!roles?.length) { setLoading(false); return; }

      const judgeIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabase.from('profiles').select('*').in('user_id', judgeIds);
      
      // Get score counts per judge
      const { data: scores } = await supabase.from('scores').select('judge_id');
      const scoreCounts: Record<string, number> = {};
      scores?.forEach(s => { scoreCounts[s.judge_id] = (scoreCounts[s.judge_id] || 0) + 1; });

      const enriched = (profiles || []).map(p => ({
        ...p,
        scores_count: scoreCounts[p.user_id] || 0,
      }));
      setJudges(enriched);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold"><span className="text-gradient-gold">Judges</span> Overview</h1>
        <p className="mb-8 text-muted-foreground">Monitor judge activity and scoring progress</p>

        <Card className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Scores Given</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : judges.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No judges found</TableCell></TableRow>
              ) : judges.map(j => (
                <TableRow key={j.id} className="border-border">
                  <TableCell className="font-medium">{j.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{j.email}</TableCell>
                  <TableCell>{j.country || 'N/A'}</TableCell>
                  <TableCell>{j.organization || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border">{j.scores_count} scores</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{new Date(j.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
