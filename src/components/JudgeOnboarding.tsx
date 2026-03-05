import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Award, Users, Globe, Trophy, ArrowRight, CheckCircle, Clock, XCircle, Upload, FileText } from 'lucide-react';

const EDUCATION_LEVELS = [
  'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate (PhD)', 'Post-Doctoral', 'Professional Certification', 'Other',
];

interface Props {
  existingApplication: any;
  applicationType: string;
}

export default function JudgeOnboarding({ existingApplication, applicationType }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'welcome' | 'form'>(existingApplication ? 'form' : 'welcome');
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const roleLabel = applicationType === 'country_representative' ? 'Country Representative' : 'Country Judge';

  const [form, setForm] = useState({
    full_name: existingApplication?.full_name || profile?.full_name || '',
    highest_education: existingApplication?.highest_education || '',
    work_experience: existingApplication?.work_experience || '',
    highest_position_held: existingApplication?.highest_position_held || '',
    current_position: existingApplication?.current_position || '',
    current_organization: existingApplication?.current_organization || '',
    years_in_education: existingApplication?.years_in_education?.toString() || '',
    areas_of_expertise: existingApplication?.areas_of_expertise || '',
    why_judge: existingApplication?.why_judge || '',
  });

  const updateField = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }));

  if (existingApplication?.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <Card className="glass-card border-primary/20">
          <CardContent className="py-12 text-center space-y-4">
            <Clock className="h-16 w-16 text-primary mx-auto" />
            <h2 className="font-display text-2xl font-bold">Application Under Review</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for applying to be a {roleLabel}! Your application is currently being reviewed.
              You will receive an email notification once processed.
            </p>
            <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
              Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingApplication?.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <Card className="glass-card border-destructive/20">
          <CardContent className="py-12 text-center space-y-4">
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="font-display text-2xl font-bold">Application Not Approved</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Unfortunately, your {roleLabel} application was not approved at this time.
            </p>
            {existingApplication.review_notes && (
              <div className="bg-secondary/50 rounded-lg p-4 text-sm text-left">
                <p className="font-semibold mb-1">Feedback:</p>
                <p className="text-muted-foreground">{existingApplication.review_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        <div className="text-center space-y-3">
          <Award className="h-16 w-16 text-primary mx-auto" />
          <h1 className="font-display text-3xl font-bold">
            Welcome to <span className="text-gradient-gold">TEGA</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your interest in becoming a {roleLabel}!
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="py-8 space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                The Transforming Education Global Awards (TEGA) seeks to <strong className="text-foreground">amplify transforming education
                initiatives</strong> by enabling educators and schools to showcase their efforts and achievements on a global stage.
              </p>
              <p>
                To achieve this, we rely on <strong className="text-foreground">reputable regional judges</strong> who can provide
                professional, fair, and thorough assessment of applicants. This role is carried out on a <strong className="text-foreground">voluntary basis</strong>.
              </p>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold mb-4">What You'll Gain</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Globe, text: 'Global recognition opportunities' },
                  { icon: Users, text: 'Panel discussion participation' },
                  { icon: Award, text: 'Endorsements & professional recognition' },
                  { icon: Trophy, text: 'Networking with judges & speakers worldwide' },
                ].map((b, i) => (
                  <div key={i} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
                    <b.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{b.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
              <p className="text-muted-foreground">
                🏆 Judges also receive globally accredited certificates, trophies, and may be invited to future advisory roundtables.
              </p>
            </div>

            <Button className="w-full bg-gradient-gold font-semibold text-lg py-6 gap-2" onClick={() => setStep('form')}>
              Continue to Application <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.full_name.trim() || !form.highest_education || !form.why_judge.trim()) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (!cvFile && !existingApplication?.cv_path) {
      toast({ title: 'CV Required', description: 'Please upload your CV/Resume.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    let cvPath = existingApplication?.cv_path || '';

    if (cvFile) {
      const filePath = `judge-applications/${user.id}/${cvFile.name}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, cvFile, { upsert: true });
      if (uploadError) {
        toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
        setSubmitting(false);
        return;
      }
      cvPath = filePath;
    }

    const payload = {
      user_id: user.id,
      application_type: applicationType,
      full_name: form.full_name.trim(),
      highest_education: form.highest_education,
      work_experience: form.work_experience.trim(),
      highest_position_held: form.highest_position_held.trim(),
      current_position: form.current_position.trim(),
      current_organization: form.current_organization.trim(),
      years_in_education: form.years_in_education ? parseInt(form.years_in_education) : null,
      areas_of_expertise: form.areas_of_expertise.trim(),
      why_judge: form.why_judge.trim(),
      cv_path: cvPath,
      status: 'pending',
    };

    let error;
    if (existingApplication) {
      ({ error } = await (supabase.from('judge_applications' as any) as any).update(payload).eq('id', existingApplication.id));
    } else {
      ({ error } = await (supabase.from('judge_applications' as any) as any).insert(payload));
    }

    setSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Application submitted!', description: 'You will be notified once reviewed.' });
      window.location.reload();
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">
          {roleLabel} <span className="text-gradient-gold">Application</span>
        </h1>
        <p className="mt-1 text-muted-foreground">Complete the form below. All fields marked * are required.</p>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Personal & Professional Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Full Name *</Label>
              <Input required value={form.full_name} onChange={e => updateField('full_name', e.target.value)} className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Highest Education Level *</Label>
              <Select value={form.highest_education} onValueChange={v => updateField('highest_education', v)}>
                <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>{EDUCATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Position</Label>
              <Input value={form.current_position} onChange={e => updateField('current_position', e.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Professor of Education" />
            </div>
            <div>
              <Label>Current Organization</Label>
              <Input value={form.current_organization} onChange={e => updateField('current_organization', e.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. University of Nairobi" />
            </div>
            <div>
              <Label>Highest Position Ever Held</Label>
              <Input value={form.highest_position_held} onChange={e => updateField('highest_position_held', e.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Dean of Faculty" />
            </div>
            <div>
              <Label>Years in Education</Label>
              <Input type="number" min={0} value={form.years_in_education} onChange={e => updateField('years_in_education', e.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. 15" />
            </div>
          </div>
          <div>
            <Label>Areas of Expertise</Label>
            <Input value={form.areas_of_expertise} onChange={e => updateField('areas_of_expertise', e.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Curriculum Design, STEM Education, Policy" />
          </div>
          <div>
            <Label>Work Experience Summary</Label>
            <Textarea value={form.work_experience} onChange={e => updateField('work_experience', e.target.value)} className="mt-1.5 bg-secondary min-h-[100px]" placeholder="Briefly describe your professional experience..." />
          </div>
          <div>
            <Label>Why do you want to serve as a {roleLabel}? *</Label>
            <Textarea value={form.why_judge} onChange={e => updateField('why_judge', e.target.value)} className="mt-1.5 bg-secondary min-h-[120px]" placeholder="Your motivation and what you bring to the judging process..." />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="font-display">Documents</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload CV / Resume *</Label>
            <p className="text-xs text-muted-foreground mb-2">PDF or Word format preferred.</p>
            {cvFile ? (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate">{cvFile.name}</span>
                <button onClick={() => setCvFile(null)} className="text-muted-foreground hover:text-destructive ml-auto">✕</button>
              </div>
            ) : existingApplication?.cv_path ? (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-success" />
                <span>CV previously uploaded</span>
              </div>
            ) : (
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80 bg-secondary rounded-lg px-3 py-3">
                <Upload className="h-4 w-4" />
                Choose file
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => setCvFile(e.target.files?.[0] || null)} />
              </Label>
            )}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-gradient-gold font-semibold text-lg py-6" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Application'}
      </Button>
    </div>
  );
}
