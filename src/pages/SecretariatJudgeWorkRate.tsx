import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

type JudgeWorkData = {
  user_id: string;
  full_name: string;
  email: string;
  country: string;
  assigned: number;
  completed: number;
  in_progress: number;
  pending: number;
  last_score_at: string | null;
  idle_days: number;
  completion_rate: number;
};

export default function SecretariatJudgeWorkRate() {
  const [judges, setJudges] = useState<JudgeWorkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total: 0, active: 0, idle: 0, avgRate: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const [rolesRes, assignRes, scoresRes, profilesRes] = await Promise.all([
        supabase.from('user_roles').select('user_id').eq('role', 'judge'),
        supabase.from('judge_assignments').select('judge_id, submission_id, status, started_at, completed_at'),
        supabase.from('scores').select('judge_id, created_at'),
        supabase.from('profiles').select('user_id, full_name, email, country'),
      ]);

      const judgeIds = (rolesRes.data || []).map(r => r.user_id);
      const assignments = assignRes.data || [];
      const scores = scoresRes.data || [];
      const profiles = profilesRes.data || [];
      const profileMap: Record<string, any> = {};
      profiles.forEach(p => { profileMap[p.user_id] = p; });

      const now = Date.now();
      const judgeData: JudgeWorkData[] = judgeIds.map(jid => {
        const jAssignments = assignments.filter(a => a.judge_id === jid);
        const jScores = scores.filter(s => s.judge_id === jid);
        const completed = jAssignments.filter(a => a.status === 'completed').length;
        const inProgress = jAssignments.filter(a => a.status === 'in_progress').length;
        const pending = jAssignments.filter(a => a.status === 'pending').length;
        const total = jAssignments.length;
        
        const lastScore = jScores.length > 0 
          ? jScores.reduce((latest, s) => s.created_at > latest ? s.created_at : latest, jScores[0].created_at)
          : null;
        
        const idleDays = lastScore 
          ? Math.floor((now - new Date(lastScore).getTime()) / (1000 * 60 * 60 * 24))
          : total > 0 ? 999 : 0;

        const p = profileMap[jid];
        return {
          user_id: jid,
          full_name: p?.full_name || 'Unknown',
          email: p?.email || '',
          country: p?.country || 'N/A',
          assigned: total,
          completed,
          in_progress: inProgress,
          pending,
          last_score_at: lastScore,
          idle_days: idleDays,
          completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      });

      // Sort: idle judges with assignments first
      judgeData.sort((a, b) => {
        if (a.assigned > 0 && b.assigned === 0) return -1;
        if (a.assigned === 0 && b.assigned > 0) return 1;
        return b.idle_days - a.idle_days;
      });

      const active = judgeData.filter(j => j.assigned > 0 && j.idle_days < 7).length;
      const idle = judgeData.filter(j => j.assigned > 0 && j.idle_days >= 7).length;
      const avgRate = judgeData.length > 0
        ? Math.round(judgeData.reduce((s, j) => s + j.completion_rate, 0) / judgeData.length)
        : 0;

      setSummary({ total: judgeData.length, active, idle, avgRate });
      setJudges(judgeData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const getStatusBadge = (j: JudgeWorkData) => {
    if (j.assigned === 0) return <Badge className="bg-muted text-muted-foreground border-0 text-xs">No assignments</Badge>;
    if (j.idle_days >= 14) return <Badge className="bg-destructive/20 text-destructive border-0 text-xs gap-1"><AlertTriangle className="h-3 w-3" />Inactive ({j.idle_days}d)</Badge>;
    if (j.idle_days >= 7) return <Badge className="bg-warning/20 text-warning border-0 text-xs gap-1"><Clock className="h-3 w-3" />Idle ({j.idle_days}d)</Badge>;
    return <Badge className="bg-success/20 text-success border-0 text-xs gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-7 w-7 text-primary" />
          <h1 className="font-display text-3xl font-bold">Judge <span className="text-gradient-gold">Work Rate</span></h1>
        </div>
        <p className="mb-8 text-muted-foreground">Track judge progress, completion rates, and idle alerts</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Judges', value: summary.total, color: 'text-foreground' },
            { label: 'Active (7d)', value: summary.active, color: 'text-success' },
            { label: 'Idle (7d+)', value: summary.idle, color: 'text-warning' },
            { label: 'Avg Completion', value: `${summary.avgRate}%`, color: 'text-primary' },
          ].map(c => (
            <Card key={c.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Judge</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Last Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : judges.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No judges found</TableCell></TableRow>
              ) : judges.map(j => (
                <TableRow key={j.user_id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium">{j.full_name}</p>
                      <p className="text-xs text-muted-foreground">{j.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{j.country}</TableCell>
                  <TableCell>{getStatusBadge(j)}</TableCell>
                  <TableCell className="font-semibold">{j.assigned}</TableCell>
                  <TableCell className="text-success font-semibold">{j.completed}</TableCell>
                  <TableCell className="text-warning">{j.pending + j.in_progress}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={j.completion_rate} className="h-2 w-16" />
                      <span className="text-xs font-medium">{j.completion_rate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {j.last_score_at ? new Date(j.last_score_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
