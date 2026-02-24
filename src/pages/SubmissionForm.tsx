import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, FileText } from 'lucide-react';

const AWARD_CATEGORIES = [
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

const ROLES = ['Director', 'Principal', 'Manager', 'Teacher', 'EdTech Representative', 'Researcher', 'Ministry/Government Official', 'Other'];
const INSTITUTION_TYPES = ['Public Primary School', 'Private Primary School', 'Public Secondary School', 'Private Secondary School', 'TVET Institution', 'University', 'EdTech Company', 'NGO/Foundation', 'Ministry/Government Program', 'Research Institution', 'Other'];
const INSTITUTION_SIZES = ['Small (Under 500 learners)', 'Medium (500-2000 learners)', 'Large (2000+ learners)'];

export default function SubmissionForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step, setStep] = useState<'section_a' | 'section_b' | 'review'>('section_a');
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [categoryFiles, setCategoryFiles] = useState<Record<string, File[]>>({});
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [form, setForm] = useState({
    nominator_name: '',
    nominator_email: '',
    nominator_phone: '',
    nominator_role: '',
    school_name: '',
    school_city: '',
    school_country: '',
    institution_type: '',
    institution_size: '',
    nomination_statement: '',
    past_awards: '',
    communication_preference: 'Email',
  });

  useEffect(() => {
    if (!user) return;
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setExistingSubmission(data[0]);
        setSubmissionCount(data[0].submission_count || 1);
        setIsLocked(data[0].is_locked || false);
        // Pre-fill form
        setForm({
          nominator_name: data[0].nominator_name,
          nominator_email: data[0].nominator_email,
          nominator_phone: data[0].nominator_phone || '',
          nominator_role: data[0].nominator_role || '',
          school_name: data[0].school_name,
          school_city: data[0].school_city,
          school_country: data[0].school_country,
          institution_type: data[0].institution_type || '',
          institution_size: data[0].institution_size || '',
          nomination_statement: data[0].nomination_statement,
          past_awards: data[0].past_awards || '',
          communication_preference: data[0].communication_preference || 'Email',
        });
        setSelectedCategories(data[0].award_categories || []);
      }
    };
    fetchExisting();
  }, [user]);

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 3 ? [...prev, cat] : prev
    );
  };

  const handleFileChange = (category: string, files: FileList | null) => {
    if (!files) return;
    const existing = categoryFiles[category] || [];
    const newFiles = Array.from(files).slice(0, 3 - existing.length);
    setCategoryFiles(prev => ({ ...prev, [category]: [...existing, ...newFiles] }));
  };

  const removeFile = (category: string, index: number) => {
    setCategoryFiles(prev => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== index),
    }));
  };

  const handleSectionA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedCategories.length === 0) {
      toast({ title: 'Select at least one award category', variant: 'destructive' });
      return;
    }
    if (isLocked) {
      toast({ title: 'Submissions locked', description: 'You have reached the maximum of 3 submissions.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const newCount = existingSubmission ? (existingSubmission.submission_count || 1) + 1 : 1;
    const locked = newCount >= 3;

    const payload = {
      submitter_id: user.id,
      ...form,
      award_categories: selectedCategories,
      region: form.school_country,
      submission_count: newCount,
      is_locked: locked,
    };

    let error;
    if (existingSubmission) {
      ({ error } = await supabase.from('submissions').update(payload).eq('id', existingSubmission.id));
    } else {
      ({ error } = await supabase.from('submissions').insert(payload));
    }

    setIsSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } else {
      // Refresh
      const { data } = await supabase.from('submissions').select('*').eq('submitter_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (data?.[0]) {
        setExistingSubmission(data[0]);
        setSubmissionCount(data[0].submission_count);
        setIsLocked(data[0].is_locked);
      }
      toast({ title: 'Section A saved!' });
      setStep('section_b');
    }
  };

  const handleUploadDocuments = async () => {
    if (!user || !existingSubmission) return;
    setUploadingDocs(true);

    // Delete old docs for this submission
    await supabase.from('submission_documents').delete().eq('submission_id', existingSubmission.id);

    for (const category of Object.keys(categoryFiles)) {
      for (const file of categoryFiles[category]) {
        const filePath = `${user.id}/${existingSubmission.id}/${category}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
        if (uploadError) {
          toast({ title: 'Upload error', description: uploadError.message, variant: 'destructive' });
          setUploadingDocs(false);
          return;
        }
        await supabase.from('submission_documents').insert({
          submission_id: existingSubmission.id,
          category,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        });
      }
    }

    setUploadingDocs(false);
    toast({ title: 'Documents uploaded successfully!' });
    setStep('review');
  };

  const handleFinalSubmit = async () => {
    if (!existingSubmission) return;
    await supabase.from('submissions').update({ status: 'submitted' }).eq('id', existingSubmission.id);
    toast({ title: 'Application submitted successfully!' });
    navigate('/submissions');
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl animate-fade-in">
        <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="mb-2 font-display text-3xl font-bold">
          {existingSubmission ? 'Update' : 'Submit'} Your <span className="text-gradient-gold">Application</span>
        </h1>
        <div className="mb-6 flex items-center gap-4">
          <p className="text-muted-foreground">Complete Sections A & B to finalize.</p>
          {submissionCount > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
              Submission {submissionCount}/3 {isLocked && '(LOCKED)'}
            </span>
          )}
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex gap-2">
          {['section_a', 'section_b', 'review'].map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${step === s ? 'bg-primary' : i < ['section_a', 'section_b', 'review'].indexOf(step) ? 'bg-success' : 'bg-secondary'}`} />
          ))}
        </div>

        {step === 'section_a' && (
          <form onSubmit={handleSectionA} className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-display">Section A: Applicant Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input required value={form.nominator_name} onChange={e => updateForm('nominator_name', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input required type="email" value={form.nominator_email} onChange={e => updateForm('nominator_email', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={form.nominator_phone} onChange={e => updateForm('nominator_phone', e.target.value)} placeholder="+254 xxx xxx xxx" className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Role/Position *</Label>
                  <Select value={form.nominator_role} onValueChange={v => updateForm('nominator_role', v)}>
                    <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="font-display">School/Organization</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>School/Organization Name *</Label>
                  <Input required value={form.school_name} onChange={e => updateForm('school_name', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input required value={form.school_city} onChange={e => updateForm('school_city', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Country *</Label>
                  <Input required value={form.school_country} onChange={e => updateForm('school_country', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Institution Type</Label>
                  <Select value={form.institution_type} onValueChange={v => updateForm('institution_type', v)}>
                    <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{INSTITUTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Institution Size</Label>
                  <Select value={form.institution_size} onValueChange={v => updateForm('institution_size', v)}>
                    <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>{INSTITUTION_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Award Categories</CardTitle>
                <p className="text-sm text-muted-foreground">Select up to 3 categories ({selectedCategories.length}/3)</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {AWARD_CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                      disabled={!selectedCategories.includes(cat) && selectedCategories.length >= 3}
                    />
                    <label className="text-sm cursor-pointer" onClick={() => toggleCategory(cat)}>{cat}</label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader><CardTitle className="font-display">Nomination Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nomination Statement * (max 600 characters)</Label>
                  <Textarea required maxLength={600} value={form.nomination_statement} onChange={e => updateForm('nomination_statement', e.target.value)} className="mt-1.5 min-h-[120px] bg-secondary" />
                  <p className="mt-1 text-xs text-muted-foreground">{form.nomination_statement.length}/600</p>
                </div>
                <div>
                  <Label>Past Awards (Optional)</Label>
                  <Input value={form.past_awards} onChange={e => updateForm('past_awards', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Preferred Communication</Label>
                  <Select value={form.communication_preference} onValueChange={v => updateForm('communication_preference', v)}>
                    <SelectTrigger className="mt-1.5 bg-secondary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-gradient-gold text-lg font-semibold py-6" disabled={isSubmitting || isLocked}>
              {isLocked ? 'Submissions Locked (3/3)' : isSubmitting ? 'Saving...' : 'Save & Continue to Section B'}
            </Button>
          </form>
        )}

        {step === 'section_b' && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Section B: Supporting Documents</CardTitle>
                <p className="text-sm text-muted-foreground">Upload up to 3 documents per category. This does not count toward your submission limit.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedCategories.map((cat, catIndex) => (
                  <div key={cat} className="space-y-3">
                    <h3 className="font-semibold text-sm">Category {catIndex + 1}: {cat}</h3>
                    <div className="flex flex-wrap gap-2">
                      {(categoryFiles[cat] || []).map((file, fi) => (
                        <div key={fi} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="max-w-[150px] truncate">{file.name}</span>
                          <button onClick={() => removeFile(cat, fi)} className="text-muted-foreground hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {(categoryFiles[cat]?.length || 0) < 3 && (
                      <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80">
                        <Upload className="h-4 w-4" />
                        Upload document ({(categoryFiles[cat]?.length || 0)}/3)
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                          onChange={e => handleFileChange(cat, e.target.files)}
                        />
                      </Label>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('section_a')}>
                Back to Section A
              </Button>
              <Button className="flex-1 bg-gradient-gold font-semibold" onClick={handleUploadDocuments} disabled={uploadingDocs}>
                {uploadingDocs ? 'Uploading...' : 'Upload & Continue'}
              </Button>
            </div>
          </div>
        )}

        {step === 'review' && existingSubmission && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Review & Final Submission</CardTitle>
                <p className="text-sm text-muted-foreground">Review your application details before final submission.</p>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground">Name:</span> {form.nominator_name}</div>
                  <div><span className="text-muted-foreground">Email:</span> {form.nominator_email}</div>
                  <div><span className="text-muted-foreground">School:</span> {form.school_name}</div>
                  <div><span className="text-muted-foreground">Country:</span> {form.school_country}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Categories:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedCategories.map(c => (
                      <span key={c} className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Statement:</span>
                  <p className="mt-1">{form.nomination_statement}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('section_b')}>
                Back to Section B
              </Button>
              <Button className="flex-1 bg-gradient-gold font-semibold text-lg py-6" onClick={handleFinalSubmit}>
                Submit Application
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
