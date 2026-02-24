import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function SecretariatStatistics() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [subsRes, rolesRes, scoresRes, assignRes, profilesRes] = await Promise.all([
        supabase.from('submissions').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('scores').select('*, submissions(school_name, school_country)'),
        supabase.from('judge_assignments').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      setSubmissions(subsRes.data || []);
      const judgeIds = rolesRes.data?.filter(r => r.role === 'judge').map(r => r.user_id) || [];
      const judgeProfiles = profilesRes.data?.filter(p => judgeIds.includes(p.user_id)) || [];
      setJudges(judgeProfiles);
      setScores(scoresRes.data || []);
      setAssignments(assignRes.data || []);
      setUsers(profilesRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const approved = submissions.filter(s => s.approval_status === 'approved');
  const declined = submissions.filter(s => s.approval_status === 'declined');
  const banned = submissions.filter(s => s.approval_status === 'banned');
  const pending = submissions.filter(s => s.approval_status === 'pending');
  const inProgress = assignments.filter(a => a.status === 'in_progress');

  // Average scores
  const avgScores = scores.length > 0 ? {
    innovation: (scores.reduce((a, s) => a + (s.innovation_score || 0), 0) / scores.length).toFixed(1),
    impact: (scores.reduce((a, s) => a + (s.impact_score || 0), 0) / scores.length).toFixed(1),
    scalability: (scores.reduce((a, s) => a + (s.scalability_score || 0), 0) / scores.length).toFixed(1),
    sustainability: (scores.reduce((a, s) => a + (s.sustainability_score || 0), 0) / scores.length).toFixed(1),
    overall: (scores.reduce((a, s) => a + (s.overall_score || 0), 0) / scores.length).toFixed(1),
  } : null;

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-success/20 text-success',
      declined: 'bg-destructive/20 text-destructive',
      banned: 'bg-destructive/30 text-destructive',
      pending: 'bg-warning/20 text-warning',
    };
    return <Badge className={`${colors[status] || ''} border-0`}>{status}</Badge>;
  };

  if (loading) return <DashboardLayout><p className="text-muted-foreground p-8">Loading statistics...</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <h1 className="mb-2 font-display text-3xl font-bold"><span className="text-gradient-gold">Statistics</span> Overview</h1>
        <p className="mb-8 text-muted-foreground">Comprehensive view across all categories</p>

        {/* Average Scores Summary */}
        {avgScores && (
          <Card className="glass-card mb-8">
            <CardHeader><CardTitle className="font-display text-lg">Average Scores Across All Submissions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-center">
                {Object.entries(avgScores).map(([key, val]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    <p className="text-2xl font-bold text-primary">{val}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="applicants" className="space-y-4">
          <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="applicants">Applicants ({submissions.length})</TabsTrigger>
            <TabsTrigger value="judges">Judges ({judges.length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="declined">Declined ({declined.length})</TabsTrigger>
            <TabsTrigger value="banned">Banned ({banned.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          </TabsList>

          {/* Applicants tab */}
          <TabsContent value="applicants">
            <Card className="glass-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>School</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map(s => (
                    <TableRow key={s.id} className="border-border">
                      <TableCell className="font-medium">{s.school_name}</TableCell>
                      <TableCell>{s.nominator_name}</TableCell>
                      <TableCell>{s.school_country}</TableCell>
                      <TableCell>{statusBadge(s.status)}</TableCell>
                      <TableCell>{statusBadge(s.approval_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Judges tab */}
          <TabsContent value="judges">
            <Card className="glass-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Judge</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>In Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {judges.map(j => {
                    const judgeAssignments = assignments.filter(a => a.judge_id === j.user_id);
                    return (
                      <TableRow key={j.id} className="border-border">
                        <TableCell className="font-medium">{j.full_name}</TableCell>
                        <TableCell>{j.country || 'N/A'}</TableCell>
                        <TableCell>{judgeAssignments.length}</TableCell>
                        <TableCell>{judgeAssignments.filter(a => a.status === 'completed').length}</TableCell>
                        <TableCell>{judgeAssignments.filter(a => a.status === 'in_progress').length}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Simple list tabs for filtered views */}
          {(['in_progress', 'approved', 'declined', 'banned', 'pending'] as const).map(tab => {
            const items = tab === 'in_progress' 
              ? submissions.filter(s => inProgress.some(a => a.submission_id === s.id))
              : tab === 'pending' ? pending : tab === 'approved' ? approved : tab === 'declined' ? declined : banned;
            return (
              <TabsContent key={tab} value={tab}>
                <Card className="glass-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>School</TableHead>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">None</TableCell></TableRow>
                      ) : items.map(s => (
                        <TableRow key={s.id} className="border-border">
                          <TableCell className="font-medium">{s.school_name}</TableCell>
                          <TableCell>{s.nominator_name}</TableCell>
                          <TableCell>{s.school_country}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
