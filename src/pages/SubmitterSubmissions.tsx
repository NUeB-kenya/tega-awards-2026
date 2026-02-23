import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/20 text-primary',
  under_review: 'bg-warning/20 text-warning',
  scored: 'bg-success/20 text-success',
  shortlisted: 'bg-success/30 text-success',
  rejected: 'bg-destructive/20 text-destructive',
};

export default function SubmitterSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('submissions')
      .select('*')
      .eq('submitter_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSubmissions(data || []);
        setLoading(false);
      });
  }, [user]);

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">My <span className="text-gradient-gold">Submissions</span></h1>
            <p className="mt-1 text-muted-foreground">Track your TEGA award nominations</p>
          </div>
          <Link to="/submissions/new">
            <Button className="bg-gradient-gold gap-2 font-semibold"><Plus className="h-4 w-4" /> New Submission</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <Card className="glass-card py-12 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No submissions yet</p>
            <Link to="/submissions/new">
              <Button className="mt-4 bg-gradient-gold">Create your first submission</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id} className="glass-card">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <h3 className="font-semibold">{sub.school_name}</h3>
                    <p className="text-sm text-muted-foreground">{sub.school_city}, {sub.school_country}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sub.award_categories?.map((cat: string) => (
                        <Badge key={cat} variant="outline" className="text-xs border-border">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`${statusColors[sub.status] || ''} border-0`}>
                      {sub.status.replace('_', ' ')}
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
