import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, Clock, Star, AlertTriangle, Shield } from 'lucide-react';

const CRITERIA = [
  { key: 'Impact & Outcomes', weight: '30%', desc: 'Measurable results, learning outcomes, retention, equity gains' },
  { key: 'Innovation & Originality', weight: '15%', desc: 'Novel approach, solves real constraints' },
  { key: 'Scalability & Replicability', weight: '15%', desc: 'Can scale to more learners/regions' },
  { key: 'Equity, Inclusion & Access', weight: '10%', desc: 'Inclusive design, reaching underserved groups' },
  { key: 'Sustainability & Governance', weight: '10%', desc: 'Long-term viability, financial resilience' },
  { key: 'Evidence & Verification', weight: '10%', desc: 'Quality of documentation, third-party proof' },
  { key: 'Ethics, Safety & Integrity', weight: '10%', desc: 'Child safeguarding, data privacy, transparency' },
];

const SCORE_BANDS = [
  { range: '90–100', label: 'World-class, award-defining', color: 'text-success' },
  { range: '80–89', label: 'Exceptional, category-leading', color: 'text-primary' },
  { range: '70–79', label: 'Strong, credible contender', color: 'text-warning' },
  { range: '60–69', label: 'Promising but not yet elite', color: 'text-muted-foreground' },
  { range: '<60', label: 'Insufficient for finalist status', color: 'text-destructive' },
];

export default function JudgeDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ assigned: 0, scored: 0, pending: 0, conflicts: 0 });
  const [coiDeclarations, setCoiDeclarations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [assignRes, scoresRes, conflictRes] = await Promise.all([
        supabase.from('judge_assignments').select('id, status').eq('judge_id', user.id),
        supabase.from('scores').select('id').eq('judge_id', user.id),
        supabase.from('conflict_declarations').select('*, submissions(school_name, school_country)').eq('judge_id', user.id),
      ]);
      const assignments = assignRes.data || [];
      const scoredCount = scoresRes.data?.length || 0;
      setStats({
        assigned: assignments.length,
        scored: scoredCount,
        pending: assignments.filter(a => a.status !== 'completed').length,
        conflicts: conflictRes.data?.length || 0,
      });
      setCoiDeclarations(conflictRes.data || []);
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Assigned to Me', value: stats.assigned, icon: FileText, color: 'text-primary' },
    { label: 'Scored', value: stats.scored, icon: CheckCircle, color: 'text-success' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-warning' },
    { label: 'COI Declared', value: stats.conflicts, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold">
          Welcome, <span className="text-gradient-gold">{profile?.full_name}</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Review and score TEGA award submissions from your assigned panel</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* COI Declarations - prominent display */}
      {coiDeclarations.length > 0 && (
        <Card className="glass-card border-warning/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <CardTitle className="font-display text-lg">Your Conflict of Interest Declarations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {coiDeclarations.map((coi: any) => (
              <div key={coi.id} className="bg-warning/10 rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{(coi.submissions as any)?.school_name || 'Unknown School'}</p>
                  <p className="text-xs text-muted-foreground">{(coi.submissions as any)?.school_country}</p>
                  <p className="text-xs mt-1">{coi.conflict_reason}</p>
                </div>
                <Badge className={`${coi.resolved ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} border-0 text-xs`}>
                  {coi.resolved ? 'Resolved' : 'Active'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scoring Rubric Reference */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Prestige Scoring Rubric (100 Points)</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Each criterion is scored 0–10, then auto-weighted. Minimum 80/100 to win.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {CRITERIA.map(c => (
              <div key={c.key} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
                <Badge className="bg-primary/20 text-primary border-0 font-bold min-w-[50px] justify-center">{c.weight}</Badge>
                <div>
                  <p className="font-semibold text-sm">{c.key}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Band Reference */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="font-display text-lg">Score Band Guide</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {SCORE_BANDS.map(b => (
              <div key={b.range} className="bg-secondary/50 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${b.color}`}>{b.range}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key rules */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Important Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span> You can only score submissions assigned to your panel</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span> Declare Conflict of Interest (COI) before scoring — conflicted submissions will be removed</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span> Low scores (below 4/10) require a mandatory comment explaining the rating</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span> Once submitted, scores are locked unless reopened by the panel chair</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">•</span> All scoring actions are recorded in an immutable audit log</li>
            <li className="flex items-start gap-2"><span className="text-warning font-bold">•</span> Winner must meet ≥80/100 average threshold; if not met, "No Winner" may be declared</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
