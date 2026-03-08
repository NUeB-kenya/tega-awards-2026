import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, Search, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AssignmentRow {
  id: string;
  judge_id: string;
  submission_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  judge_name: string;
  judge_email: string;
  school_name: string;
  categories: string[];
  submission_status: string;
}

export default function SecretariatPanels() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      const [assignRes, profilesRes, subsRes] = await Promise.all([
        supabase.from('judge_assignments').select('*'),
        supabase.from('profiles').select('user_id, full_name, email'),
        supabase.from('submissions').select('id, school_name, award_categories, status'),
      ]);

      const profiles = profilesRes.data || [];
      const subs = subsRes.data || [];
      const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
      const subMap = Object.fromEntries(subs.map(s => [s.id, s]));

      const rows: AssignmentRow[] = (assignRes.data || []).map(a => {
        const prof = profileMap[a.judge_id];
        const sub = subMap[a.submission_id];
        return {
          id: a.id,
          judge_id: a.judge_id,
          submission_id: a.submission_id,
          status: a.status,
          started_at: a.started_at,
          completed_at: a.completed_at,
          judge_name: prof?.full_name || 'Unknown',
          judge_email: prof?.email || '',
          school_name: sub?.school_name || 'Unknown',
          categories: sub?.award_categories || [],
          submission_status: sub?.status || '',
        };
      });

      setAssignments(rows);
      setLoading(false);
    };
    fetchAssignments();
  }, []);

  const filtered = assignments.filter(a => {
    const matchesSearch = search === '' ||
      a.judge_name.toLowerCase().includes(search.toLowerCase()) ||
      a.school_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group by judge
  const byJudge = filtered.reduce<Record<string, AssignmentRow[]>>((acc, a) => {
    if (!acc[a.judge_id]) acc[a.judge_id] = [];
    acc[a.judge_id].push(a);
    return acc;
  }, {});

  const totalAssigned = assignments.length;
  const totalCompleted = assignments.filter(a => a.status === 'completed').length;
  const totalInProgress = assignments.filter(a => a.status === 'in_progress').length;

  const statusBadge = (status: string) => {
    if (status === 'completed') return <Badge className="bg-success/20 text-success border-0">Completed</Badge>;
    if (status === 'in_progress') return <Badge className="bg-warning/20 text-warning border-0">In Progress</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold">
            <span className="text-gradient-gold">Judge</span> Assignment Overview
          </h1>
          <p className="mt-1 text-muted-foreground">See which judges are assigned to which submissions and their progress.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Assignments</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalAssigned}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <Clock className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalInProgress}</p></CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalCompleted}</p></CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by judge or school name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-10">Loading assignments...</p>
        ) : Object.keys(byJudge).length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-10 text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2 text-warning" />
              No judge assignments found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(byJudge).map(([judgeId, rows]) => {
              const completed = rows.filter(r => r.status === 'completed').length;
              return (
                <Card key={judgeId} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base font-semibold">{rows[0].judge_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{rows[0].judge_email}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {completed}/{rows.length} completed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {rows.map(row => (
                        <div key={row.id} className="flex items-center justify-between py-2.5 gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{row.school_name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {row.categories.join(', ') || 'No categories'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {statusBadge(row.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
