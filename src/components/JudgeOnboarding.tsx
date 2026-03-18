import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import {
  Award,
  Users,
  Globe,
  Trophy,
  ArrowRight,
  Clock,
  XCircle,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';

const EDUCATION_LEVELS = [
  'Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate (PhD)',
  'Post-Doctoral',
  'Professional Certification',
  'Other',
];

const ALL_CATEGORIES = [
  'Global Transformational School of the Year',
  'Global Education Innovation of the Year',
  'Lifetime Contribution to Education Transformation',
  'Transformational Educator of the Year',
  'Innovative School Leader / Principal of the Year',
  'Emerging Education Leader Award (Under 40)',
  'Education System Leadership Award',
  'Most Innovative School Model',
  'Rural & Underserved Communities Impact Award',
  'Inclusive & Equitable Learning Excellence Award',
  'AI & Data Innovation in Education Award',
  'Best EdTech Solution for Low-Resource Settings',
  'STEM & Future Skills Advancement Award',
  'Youth Education Changemaker Award',
];

const MAX_EXPERTISE_CATEGORIES = 5;
const MAX_FILE_SIZE_MB = 10;
const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

interface Props {
  existingApplication: any;
  applicationType: string;
}

function sanitizeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '');
}

export default function JudgeOnboarding({ existingApplication, applicationType }: Props) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'welcome' | 'form'>(existingApplication && existingApplication.status !== 'rejected' ? 'form' : 'welcome');
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [coiFile, setCoiFile] = useState<File | null>(null);

  const roleLabel = applicationType === 'country_representative' ? 'Country Representative' : 'Country Judge';
  const isRejected = existingApplication?.status === 'rejected';

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
    expertise_categories: existingApplication?.expertise_categories || [],
    has_coi: existingApplication?.has_coi || false,
    coi_description: existingApplication?.coi_description || '',
  });

  const updateField = (key: string, value: any) => setForm((previous) => ({ ...previous, [key]: value }));

  const validateDocument = (file: File) => {
    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      return 'Only PDF, DOC, and DOCX files are allowed.';
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File must be smaller than ${MAX_FILE_SIZE_MB}MB.`;
    }

    return null;
  };

  const handleFileSelect = (file: File | null, type: 'cv' | 'coi') => {
    if (!file) return;

    const validationError = validateDocument(file);
    if (validationError) {
      toast({ title: 'Invalid file', description: validationError, variant: 'destructive' });
      return;
    }

    if (type === 'cv') {
      setCvFile(file);
      return;
    }

    setCoiFile(file);
  };

  const toggleCategory = (category: string) => {
    setForm((previous) => {
      if (previous.expertise_categories.includes(category)) {
        return {
          ...previous,
          expertise_categories: previous.expertise_categories.filter((item: string) => item !== category),
        };
      }

      if (previous.expertise_categories.length >= MAX_EXPERTISE_CATEGORIES) {
        return previous;
      }

      return {
        ...previous,
        expertise_categories: [...previous.expertise_categories, category],
      };
    });
  };

  const uploadDocument = async (file: File, prefix: string) => {
    if (!user) return null;

    const safeName = sanitizeFileName(file.name);
    const filePath = `judge-applications/${user.id}/${prefix}-${Date.now()}-${safeName}`;
    const { error } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });

    if (error) {
      throw error;
    }

    return filePath;
  };

  if (existingApplication?.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
        <Card className="glass-card border-primary/20">
          <CardContent className="py-12 text-center space-y-4">
            <Clock className="h-16 w-16 text-primary mx-auto" />
            <h2 className="font-display text-2xl font-bold">Application Under Review</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for applying to be a {roleLabel}. Your application is currently being reviewed and cannot be edited right now.
            </p>
            <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
              Submitted on {new Date(existingApplication.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'welcome') {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
        {isRejected && (
          <Card className="glass-card border-destructive/20">
            <CardContent className="py-8 space-y-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-10 w-10 text-destructive shrink-0" />
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-bold">Application Needs Revision</h2>
                  <p className="text-muted-foreground">
                    Your previous {roleLabel.toLowerCase()} application was not approved. You can now update it and resubmit.
                  </p>
                  {existingApplication?.review_notes && (
                    <div className="bg-secondary/50 rounded-lg p-4 text-sm text-left">
                      <p className="font-semibold mb-1">Feedback</p>
                      <p className="text-muted-foreground">{existingApplication.review_notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <Button className="w-full bg-gradient-gold font-semibold gap-2" onClick={() => setStep('form')}>
                Update and Resubmit <RefreshCw className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center space-y-3">
          <Award className="h-16 w-16 text-primary mx-auto" />
          <h1 className="font-display text-3xl font-bold">
            Welcome to <span className="text-gradient-gold">TEGA</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Thank you for your interest in becoming a {roleLabel}.
          </p>
        </div>

        <Card className="glass-card">
          <CardContent className="py-8 space-y-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                The Transforming Education Global Awards (TEGA) seeks to <strong className="text-foreground">amplify transforming education initiatives</strong> by enabling educators and schools to showcase their efforts and achievements on a global stage.
              </p>
              <p>
                To achieve this, we rely on <strong className="text-foreground">reputable regional judges</strong> who can provide professional, fair, and thorough assessment of applicants. This role is carried out on a <strong className="text-foreground">voluntary basis</strong>.
              </p>
            </div>

            <div>
              <h3 className="font-display text-lg font-semibold mb-4">What You&apos;ll Gain</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Globe, text: 'Global recognition opportunities' },
                  { icon: Users, text: 'Panel discussion participation' },
                  { icon: Award, text: 'Endorsements and professional recognition' },
                  { icon: Trophy, text: 'Networking with judges and speakers worldwide' },
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3 bg-secondary/50 rounded-lg p-3">
                    <benefit.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="font-display text-base font-semibold mb-3">Application Requirements</h3>
              <div className="grid gap-2 text-sm text-muted-foreground">
                {[
                  'Complete your professional profile and work history.',
                  `Select up to ${MAX_EXPERTISE_CATEGORIES} award categories you are qualified to evaluate.`,
                  'Upload your CV or résumé in PDF or Word format.',
                  'Declare any Conflict of Interest and upload a supporting document if applicable.',
                  'Applications are reviewed before judge access is granted.',
                ].map((requirement) => (
                  <div key={requirement} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{requirement}</span>
                  </div>
                ))}
              </div>
            </div>

            {!isRejected && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  🏆 Judges also receive globally accredited certificates, trophies, and may be invited to future advisory roundtables.
                </p>
              </div>
            )}

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

    const requiredTextFields = [
      { key: 'full_name', label: 'Full name' },
      { key: 'highest_education', label: 'Highest education level' },
      { key: 'current_position', label: 'Current position' },
      { key: 'current_organization', label: 'Current organization' },
      { key: 'highest_position_held', label: 'Highest position held' },
      { key: 'years_in_education', label: 'Years in education' },
      { key: 'areas_of_expertise', label: 'Areas of expertise' },
      { key: 'work_experience', label: 'Work experience summary' },
      { key: 'why_judge', label: `Why you want to serve as a ${roleLabel}` },
    ];

    const missingField = requiredTextFields.find(({ key }) => !String(form[key as keyof typeof form] || '').trim());
    if (missingField) {
      toast({ title: 'Missing required field', description: `${missingField.label} is required.`, variant: 'destructive' });
      return;
    }

    const yearsInEducation = Number(form.years_in_education);
    if (!Number.isFinite(yearsInEducation) || yearsInEducation < 0) {
      toast({ title: 'Invalid years in education', description: 'Please enter a valid number of years.', variant: 'destructive' });
      return;
    }

    if (form.expertise_categories.length === 0) {
      toast({ title: 'Select categories', description: 'Please choose at least one category you are qualified to evaluate.', variant: 'destructive' });
      return;
    }

    if (form.expertise_categories.length > MAX_EXPERTISE_CATEGORIES) {
      toast({ title: 'Too many categories', description: `You can select up to ${MAX_EXPERTISE_CATEGORIES} categories only.`, variant: 'destructive' });
      return;
    }

    if (!cvFile && !existingApplication?.cv_path) {
      toast({ title: 'CV required', description: 'Please upload your CV or résumé.', variant: 'destructive' });
      return;
    }

    if (form.has_coi && !form.coi_description.trim()) {
      toast({ title: 'Conflict details required', description: 'Please describe your conflict of interest.', variant: 'destructive' });
      return;
    }

    if (form.has_coi && !coiFile && !existingApplication?.coi_document_path) {
      toast({ title: 'COI document required', description: 'Please upload your Conflict of Interest declaration document.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      let cvPath = existingApplication?.cv_path || '';
      let coiPath = existingApplication?.coi_document_path || '';

      if (cvFile) {
        cvPath = (await uploadDocument(cvFile, 'cv')) || '';
      }

      if (coiFile) {
        coiPath = (await uploadDocument(coiFile, 'coi')) || '';
      }

      const payload: any = {
        user_id: user.id,
        application_type: applicationType,
        full_name: form.full_name.trim(),
        highest_education: form.highest_education,
        work_experience: form.work_experience.trim(),
        highest_position_held: form.highest_position_held.trim(),
        current_position: form.current_position.trim(),
        current_organization: form.current_organization.trim(),
        years_in_education: yearsInEducation,
        areas_of_expertise: form.areas_of_expertise.trim(),
        why_judge: form.why_judge.trim(),
        cv_path: cvPath,
        expertise_categories: form.expertise_categories,
        has_coi: form.has_coi,
        coi_document_path: form.has_coi ? coiPath || null : null,
        coi_description: form.has_coi ? form.coi_description.trim() : null,
        status: 'pending',
      };

      let error;
      if (existingApplication) {
        ({ error } = await supabase.from('judge_applications')
          .update(payload)
          .eq('id', existingApplication.id));
      } else {
        ({ error } = await supabase.from('judge_applications').insert(payload));
      }

      if (error) {
        throw error;
      }

      toast({
        title: existingApplication ? 'Application resubmitted' : 'Application submitted',
        description: 'You will be notified once it has been reviewed.',
      });
      window.location.reload();
    } catch (error: any) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
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

      {isRejected && (
        <Card className="glass-card border-warning/30">
          <CardContent className="py-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Please update the highlighted requirements and resubmit your application.</p>
              {existingApplication?.review_notes && <p className="text-sm text-muted-foreground">Admin feedback: {existingApplication.review_notes}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Personal and Professional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Full Name *</Label>
              <Input required value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} className="mt-1.5 bg-secondary" />
            </div>
            <div>
              <Label>Highest Education Level *</Label>
              <Select value={form.highest_education} onValueChange={(value) => updateField('highest_education', value)}>
                <SelectTrigger className="mt-1.5 bg-secondary">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Current Position *</Label>
              <Input value={form.current_position} onChange={(event) => updateField('current_position', event.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Professor of Education" />
            </div>
            <div>
              <Label>Current Organization *</Label>
              <Input value={form.current_organization} onChange={(event) => updateField('current_organization', event.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. University of Nairobi" />
            </div>
            <div>
              <Label>Highest Position Ever Held *</Label>
              <Input value={form.highest_position_held} onChange={(event) => updateField('highest_position_held', event.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Dean of Faculty" />
            </div>
            <div>
              <Label>Years in Education *</Label>
              <Input type="number" min={0} value={form.years_in_education} onChange={(event) => updateField('years_in_education', event.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. 15" />
            </div>
          </div>
          <div>
            <Label>Areas of Expertise *</Label>
            <Input value={form.areas_of_expertise} onChange={(event) => updateField('areas_of_expertise', event.target.value)} className="mt-1.5 bg-secondary" placeholder="e.g. Curriculum Design, STEM Education, Policy" />
          </div>
          <div>
            <Label>Work Experience Summary *</Label>
            <Textarea value={form.work_experience} onChange={(event) => updateField('work_experience', event.target.value)} className="mt-1.5 bg-secondary min-h-[100px]" placeholder="Briefly describe your professional experience..." />
          </div>
          <div>
            <Label>Why do you want to serve as a {roleLabel}? *</Label>
            <Textarea value={form.why_judge} onChange={(event) => updateField('why_judge', event.target.value)} className="mt-1.5 bg-secondary min-h-[120px]" placeholder="Your motivation and what you bring to the judging process..." />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Categories You Can Evaluate *</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select up to {MAX_EXPERTISE_CATEGORIES} award categories you are qualified to judge. ({form.expertise_categories.length}/{MAX_EXPERTISE_CATEGORIES} selected)
            {form.expertise_categories.length >= MAX_EXPERTISE_CATEGORIES && ' ✅ Maximum reached'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {ALL_CATEGORIES.map((category) => {
              const isSelected = form.expertise_categories.includes(category);
              const isDisabled = !isSelected && form.expertise_categories.length >= MAX_EXPERTISE_CATEGORIES;

              return (
                <label
                  key={category}
                  className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                    isSelected
                      ? 'bg-primary/10 border border-primary/30 cursor-pointer'
                      : isDisabled
                        ? 'bg-secondary/30 border border-transparent opacity-50 cursor-not-allowed'
                        : 'bg-secondary/50 border border-transparent hover:border-border cursor-pointer'
                  }`}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleCategory(category)} className="mt-0.5" disabled={isDisabled} />
                  <span className="text-sm">{category}</span>
                </label>
              );
            })}
          </div>
          {form.expertise_categories.length === 0 && <p className="text-xs text-destructive mt-2">Please select at least one category.</p>}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Conflict of Interest Declaration *
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Do you have any potential conflict of interest that could affect your impartiality as a judge?
          </p>
          <RadioGroup value={form.has_coi ? 'yes' : 'no'} onValueChange={(value) => updateField('has_coi', value === 'yes')}>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="no" />
              <Label>No — I have no conflicts of interest</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="yes" />
              <Label>Yes — I have a potential conflict of interest</Label>
            </div>
          </RadioGroup>

          {form.has_coi && (
            <div className="space-y-3 border-t border-border pt-4">
              <div>
                <Label>Describe the conflict of interest *</Label>
                <Textarea
                  value={form.coi_description}
                  onChange={(event) => updateField('coi_description', event.target.value)}
                  className="mt-1.5 bg-secondary"
                  placeholder="Describe the nature of the conflict..."
                />
              </div>
              <div>
                <Label>Upload COI Declaration Document *</Label>
                <p className="text-xs text-muted-foreground mb-2">PDF or Word format, up to {MAX_FILE_SIZE_MB}MB.</p>
                {coiFile ? (
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-warning" />
                    <span className="truncate">{coiFile.name}</span>
                    <button onClick={() => setCoiFile(null)} className="text-muted-foreground hover:text-destructive ml-auto" type="button">
                      ✕
                    </button>
                  </div>
                ) : existingApplication?.coi_document_path ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 text-success" />
                      <span>COI document previously uploaded</span>
                    </div>
                    <Label className="flex items-center gap-2 cursor-pointer text-sm text-warning hover:text-warning/80 bg-secondary rounded-lg px-3 py-3">
                      <RefreshCw className="h-4 w-4" />
                      Replace COI document
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(event) => handleFileSelect(event.target.files?.[0] || null, 'coi')} />
                    </Label>
                  </div>
                ) : (
                  <Label className="flex items-center gap-2 cursor-pointer text-sm text-warning hover:text-warning/80 bg-secondary rounded-lg px-3 py-3">
                    <Upload className="h-4 w-4" />
                    Choose COI document
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(event) => handleFileSelect(event.target.files?.[0] || null, 'coi')} />
                  </Label>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload CV / Resume *</Label>
            <p className="text-xs text-muted-foreground mb-2">PDF or Word format, up to {MAX_FILE_SIZE_MB}MB.</p>
            {cvFile ? (
              <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate">{cvFile.name}</span>
                <button onClick={() => setCvFile(null)} className="text-muted-foreground hover:text-destructive ml-auto" type="button">
                  ✕
                </button>
              </div>
            ) : existingApplication?.cv_path ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-success" />
                  <span>CV previously uploaded</span>
                </div>
                <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80 bg-secondary rounded-lg px-3 py-3">
                  <RefreshCw className="h-4 w-4" />
                  Replace CV / Resume
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(event) => handleFileSelect(event.target.files?.[0] || null, 'cv')} />
                </Label>
              </div>
            ) : (
              <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80 bg-secondary rounded-lg px-3 py-3">
                <Upload className="h-4 w-4" />
                Choose file
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(event) => handleFileSelect(event.target.files?.[0] || null, 'cv')} />
              </Label>
            )}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-gradient-gold font-semibold text-lg py-6" onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : existingApplication ? 'Resubmit Application' : 'Submit Application'}
      </Button>
    </div>
  );
}
