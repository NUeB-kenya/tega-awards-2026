import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Plus, FileText, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-primary/20 text-primary',
  under_review: 'bg-warning/20 text-warning',
  scored: 'bg-success/20 text-success',
  shortlisted: 'bg-success/30 text-success',
  rejected: 'bg-destructive/20 text-destructive',
  approved: 'bg-success/20 text-success',
  declined: 'bg-destructive/20 text-destructive',
  pending: 'bg-warning/20 text-warning',
  banned: 'bg-destructive/30 text-destructive',
};

export default function SubmitterSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocs, setViewingDocs] = useState<any[] | null>(null);

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

  const viewDocuments = async (submissionId: string) => {
    const { data } = await supabase.from('submission_documents').select('*').eq('submission_id', submissionId);
    setViewingDocs(data || []);
  };

  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const getSignedUrl = async (filePath: string) => {
    if (docUrls[filePath]) return docUrls[filePath];
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600);
    if (data?.signedUrl) {
      setDocUrls(prev => ({ ...prev, [filePath]: data.signedUrl }));
      return data.signedUrl;
    }
    return '#';
  };

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">My <span className="text-gradient-gold">Applications</span></h1>
            <p className="mt-1 text-muted-foreground">Track your TEGA award applications</p>
          </div>
          <Link to="/submissions/new">
            <Button className="bg-gradient-gold gap-2 font-semibold"><Plus className="h-4 w-4" /> New Application</Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <Card className="glass-card py-12 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg text-muted-foreground">No applications yet</p>
            <Link to="/submissions/new">
              <Button className="mt-4 bg-gradient-gold">Create your first application</Button>
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
                    <p className="mt-2 text-xs text-muted-foreground">
                      Submissions: {sub.submission_count}/3 {sub.is_locked && '(Locked)'}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={`${statusColors[sub.status] || ''} border-0`}>
                      {sub.status.replace('_', ' ')}
                    </Badge>
                    {sub.approval_status !== 'pending' && (
                      <Badge className={`${statusColors[sub.approval_status] || 'bg-muted text-muted-foreground'} border-0 ml-1`}>
                        {sub.approval_status}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => viewDocuments(sub.id)}>
                      <Eye className="h-3 w-3" /> Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Documents Dialog */}
        <Dialog open={!!viewingDocs} onOpenChange={() => setViewingDocs(null)}>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Uploaded Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {viewingDocs?.length === 0 && <p className="text-muted-foreground text-sm">No documents uploaded.</p>}
              {viewingDocs?.map(doc => {
                // Eagerly fetch signed URL
                if (!docUrls[doc.file_path]) {
                  getSignedUrl(doc.file_path);
                }
                return (
                <div key={doc.id} className="flex items-center justify-between bg-secondary rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">{doc.category}</p>
                    </div>
                  </div>
                  {docUrls[doc.file_path] ? (
                    <a href={docUrls[doc.file_path]} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">View</Button>
                    </a>
                  ) : (
                    <Button variant="ghost" size="sm" disabled>Loading...</Button>
                  )}
                </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
