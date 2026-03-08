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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, X, FileText, AlertTriangle } from 'lucide-react';

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

const CATEGORY_DOCUMENTS: Record<string, { label: string; docs: string[] }> = {
  'Global Transformational School of the Year': {
    label: 'Schools demonstrating systemic transformation in education',
    docs: ['School Transformation Report (3–5 pages: model, philosophy, transformation)', 'Impact Evidence Report (student outcomes, test scores, graduation rates)', 'External Validation / Recognition (awards, partnerships, media, endorsements)'],
  },
  'Global Education Innovation of the Year': {
    label: 'Breakthrough educational ideas, programs, or methodologies',
    docs: ['Innovation Description Document (what it is, how it works, problem solved)', 'Implementation & Results Evidence (data, case studies, pilot results)', 'Supporting Media or Documentation (screenshots, reports, research papers)'],
  },
  'Lifetime Contribution to Education Transformation': {
    label: 'Individuals with long-term impact in education',
    docs: ['Professional Portfolio / Biography (career achievements, milestones)', 'Evidence of Long-Term Impact (publications, reforms, institutions built)', 'Letters of Recognition / Testimonials (from institutions, leaders)'],
  },
  'Transformational Educator of the Year': {
    label: 'Teachers who transform student learning and outcomes',
    docs: ['Teaching Philosophy & Practice Statement', 'Student Impact Evidence (results, projects, testimonials)', 'Classroom Artifacts (lesson plans, learning materials, student work)'],
  },
  'Innovative School Leader / Principal of the Year': {
    label: 'School leaders driving innovation and institutional change',
    docs: ['Leadership Strategy Report', 'School Performance Evidence (measurable improvement)', 'Stakeholder Testimonials (teachers, parents, community)'],
  },
  'Emerging Education Leader Award (Under 40)': {
    label: 'Young leaders in education',
    docs: ['Leadership Portfolio (initiatives, projects)', 'Impact Evidence (results in schools or programs)', 'Recognition or Media Mentions (awards, press)'],
  },
  'Education System Leadership Award': {
    label: 'Leaders impacting national or regional education systems',
    docs: ['Policy or System Reform Documentation', 'Evidence of System-Level Impact (programs, policy results)', 'Institutional Endorsements'],
  },
  'Most Innovative School Model': {
    label: 'Schools with new or alternative education models',
    docs: ['School Model Framework Document', 'Evidence of Implementation', 'Student Outcomes & Case Studies'],
  },
  'Rural & Underserved Communities Impact Award': {
    label: 'Impact in rural and underserved communities',
    docs: ['Community Impact Report', 'Evidence of Access Improvement (enrollment, infrastructure)', 'Community Testimonials'],
  },
  'Inclusive & Equitable Learning Excellence Award': {
    label: 'Excellence in inclusive and equitable learning',
    docs: ['Inclusion Strategy Document', 'Evidence of Accessibility & Equity Outcomes', 'Supporting Policy or Program Materials'],
  },
  'AI & Data Innovation in Education Award': {
    label: 'AI and data innovation in education',
    docs: ['AI / Data Solution Description', 'Usage & Impact Data', 'Technical or Research Documentation'],
  },
  'Best EdTech Solution for Low-Resource Settings': {
    label: 'EdTech for low-resource environments',
    docs: ['EdTech Solution Overview', 'Evidence of Deployment in Low-Resource Environments', 'User Impact Data (students/teachers reached)'],
  },
  'STEM & Future Skills Advancement Award': {
    label: 'STEM and future skills advancement',
    docs: ['STEM Program Description', 'Student Participation & Achievement Data', 'Project / Innovation Portfolio'],
  },
  'Youth Education Changemaker Award': {
    label: 'Young leaders transforming education',
    docs: ['Initiative or Project Description', 'Evidence of Youth Impact', 'Mentor or Institutional Endorsement'],
  },
};

const ROLES = ['Director', 'Principal', 'Manager', 'Teacher', 'EdTech Representative', 'Researcher', 'Ministry/Government Official', 'Other'];
const INSTITUTION_TYPES = [
  'Public Primary School', 'Private Primary School',
  'Public Secondary School', 'Private Secondary School',
  'Public Primary & Secondary School', 'Private Primary & Secondary School',
  'Comprehensive School(s)',
  'TVET Institution', 'University',
  'EdTech Company', 'NGO/Foundation',
  'Ministry/Government Program', 'Research Institution', 'Other',
];
const INSTITUTION_SIZES = ['Small (Under 500 learners)', 'Medium (500-2000 learners)', 'Large (2000+ learners)'];

export default function SubmissionForm() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [step, setStep] = useState<'section_a' | 'nominations' | 'section_b' | 'payment' | 'review'>('section_a');
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [categoryFiles, setCategoryFiles] = useState<Record<string, File[]>>({});
  const [orgFiles, setOrgFiles] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'waived'>('pending');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [nominationStatements, setNominationStatements] = useState<Record<string, string>>({});
  const [showDocWarning, setShowDocWarning] = useState(false);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Payment callback effect - must be before any conditional returns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    if (reference && params.get('payment') === 'verify') {
      const verifyPayment = async () => {
        const { data } = await supabase.functions.invoke('verify-payment', { body: { reference } });
        if (data?.success) {
          setPaymentStatus('completed');
          setStep('review');
          toast({ title: '✅ Payment confirmed!' });
        } else {
          toast({ title: 'Payment verification failed', variant: 'destructive' });
          setStep('payment');
        }
        window.history.replaceState({}, '', window.location.pathname);
      };
      verifyPayment();
    }
  }, []);

  const [form, setForm] = useState({
    nominator_name: profile?.full_name || '',
    nominator_email: profile?.email || user?.email || '',
    nominator_phone: profile?.phone || '',
    nominator_role: '',
    school_name: '',
    school_city: '',
    school_country: profile?.country || '',
    institution_type: '',
    institution_size: '',
    past_awards: '',
    communication_preference: 'Email',
  });

  useEffect(() => {
    if (!user) return;
    // Auto-fill from profile
    if (profile) {
      setForm(prev => ({
        ...prev,
        nominator_name: prev.nominator_name || profile.full_name || '',
        nominator_email: profile.email || user.email || '',
        nominator_phone: prev.nominator_phone || profile.phone || '',
        school_country: prev.school_country || profile.country || '',
      }));
    }

    const fetchExisting = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('submitter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const sub = data[0];
    if (sub.status !== 'draft') {
          setAlreadySubmitted(true);
          return;
        }
        setExistingSubmission(sub);
        setForm({
          nominator_name: sub.nominator_name,
          nominator_email: sub.nominator_email,
          nominator_phone: sub.nominator_phone || '',
          nominator_role: sub.nominator_role || '',
          school_name: sub.school_name,
          school_city: sub.school_city,
          school_country: sub.school_country,
          institution_type: sub.institution_type || '',
          institution_size: sub.institution_size || '',
          past_awards: sub.past_awards || '',
          communication_preference: sub.communication_preference || 'Email',
        });
        setSelectedCategories(sub.award_categories || []);
        setNominationStatements((sub as any).nomination_statements || {});

        // Load existing docs
        const { data: docs } = await supabase.from('submission_documents').select('*').eq('submission_id', sub.id);
        if (docs) setExistingDocs(docs);

        // Check payment
        const { data: paymentData } = await supabase.from('payments').select('payment_status').eq('submission_id', sub.id).order('created_at', { ascending: false }).limit(1);
        if (paymentData?.[0]?.payment_status === 'completed' || paymentData?.[0]?.payment_status === 'waived') {
          setPaymentStatus(paymentData[0].payment_status as any);
        }
        if ((sub as any).status === 'paid') setPaymentStatus('completed');
      }
    };
    fetchExisting();
  }, [user, profile]);

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

  // If already submitted, show locked message
  if (alreadySubmitted) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-3xl animate-fade-in text-center py-20">
          <CheckIcon className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold mb-2">Application Already Submitted</h1>
          <p className="text-muted-foreground mb-6">Your application has been submitted and is being processed. You cannot submit another application.</p>
          <Button variant="outline" onClick={() => navigate('/submissions')}>View My Applications</Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleSectionA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedCategories.length === 0) {
      toast({ title: 'Select at least one award category', variant: 'destructive' });
      return;
    }
    if (orgFiles.length === 0 && !existingDocs.some(d => d.category === 'organization')) {
      toast({ title: 'Registration documents required', description: 'Please upload your school/organisation registration documents.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      submitter_id: user.id,
      nominator_name: form.nominator_name,
      nominator_email: form.nominator_email,
      nominator_phone: form.nominator_phone,
      nominator_role: form.nominator_role,
      school_name: form.school_name,
      school_city: form.school_city,
      school_country: form.school_country,
      institution_type: form.institution_type,
      institution_size: form.institution_size,
      past_awards: form.past_awards,
      communication_preference: form.communication_preference,
      award_categories: selectedCategories,
      nomination_statement: 'See per-category statements',
      nomination_statements: nominationStatements as any,
      region: form.school_country,
      submission_count: 1,
      is_locked: false,
      status: 'draft',
    };

    let subId = existingSubmission?.id;
    let error;
    if (existingSubmission) {
      ({ error } = await supabase.from('submissions').update(payload).eq('id', existingSubmission.id));
    } else {
      const res = await supabase.from('submissions').insert(payload).select().single();
      error = res.error;
      if (res.data) subId = res.data.id;
    }

    // Upload org docs
    if (!error && subId && orgFiles.length > 0) {
      for (const file of orgFiles) {
        const filePath = `${user.id}/${subId}/organization/${file.name}`;
        await supabase.storage.from('documents').upload(filePath, file, { upsert: true });
        await supabase.from('submission_documents').insert({
          submission_id: subId,
          category: 'organization',
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
        });
      }
    }

    setIsSubmitting(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    } else {
      if (!existingSubmission) {
        const { data } = await supabase.from('submissions').select('*').eq('submitter_id', user.id).order('created_at', { ascending: false }).limit(1);
        if (data?.[0]) setExistingSubmission(data[0]);
      }
      toast({ title: 'Section A saved!' });
      setStep('nominations');
    }
  };

  const handleNominations = async () => {
    for (const cat of selectedCategories) {
      if (!nominationStatements[cat]?.trim()) {
        toast({ title: `Nomination statement required for "${cat}"`, variant: 'destructive' });
        return;
      }
    }
    // Save nomination statements
    if (existingSubmission) {
      await supabase.from('submissions').update({ nomination_statements: nominationStatements } as any).eq('id', existingSubmission.id);
    }
    setStep('section_b');
  };

  const handleUploadDocuments = async () => {
    if (!user || !existingSubmission) return;

    // Check minimum 2 docs per category
    for (const cat of selectedCategories) {
      const newFiles = categoryFiles[cat]?.length || 0;
      const existingCatDocs = existingDocs.filter(d => d.category === cat).length;
      const total = newFiles + existingCatDocs;
      if (total < 2) {
        if (total < 1) {
          setShowDocWarning(true);
          return;
        }
        // 1 doc - show warning popup
        setShowDocWarning(true);
        return;
      }
    }

    await doUpload();
  };

  const doUpload = async () => {
    if (!user || !existingSubmission) return;
    setUploadingDocs(true);
    setShowDocWarning(false);

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
    setStep('payment');
  };

  const proceedWithWarning = () => {
    // Check if at least 1 doc per category with new files
    for (const cat of selectedCategories) {
      const newFiles = categoryFiles[cat]?.length || 0;
      const existingCatDocs = existingDocs.filter(d => d.category === cat).length;
      if (newFiles + existingCatDocs < 1) {
        toast({ title: 'At least one document required per category', variant: 'destructive' });
        setShowDocWarning(false);
        return;
      }
    }
    doUpload();
  };

  const handlePayment = async () => {
    if (!existingSubmission || !user) return;
    setProcessingPayment(true);
    const callbackUrl = `${window.location.origin}/submissions/new?payment=verify`;
    const { data, error } = await supabase.functions.invoke('initialize-payment', {
      body: {
        submissionId: existingSubmission.id,
        email: form.nominator_email || user.email,
        amount: 100,
        callbackUrl,
      },
    });
    setProcessingPayment(false);
    if (error || !data?.authorization_url) {
      toast({ title: 'Payment initialization failed', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    window.location.href = data.authorization_url;
  };

  // Payment verification useEffect moved to top of component

  const handleFinalSubmit = async () => {
    if (!existingSubmission) return;
    if (paymentStatus !== 'completed' && paymentStatus !== 'waived') {
      toast({ title: 'Payment required', variant: 'destructive' });
      setStep('payment');
      return;
    }
    await supabase.from('submissions').update({ status: 'submitted', is_locked: true }).eq('id', existingSubmission.id);
    
    // Send confirmation email
    try {
      await supabase.functions.invoke('send-submission-confirmation', {
        body: { submissionId: existingSubmission.id, userId: user!.id },
      });
    } catch {}

    // AI content analysis (runs in background)
    try {
      await supabase.functions.invoke('analyze-content', {
        body: { submissionId: existingSubmission.id, statements: nominationStatements },
      });
    } catch {}

    toast({ title: '✅ Application submitted successfully!', description: 'You will receive a confirmation email shortly.' });
    navigate('/submissions');
  };

  const steps = ['section_a', 'nominations', 'section_b', 'payment', 'review'];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl animate-fade-in">
        <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="mb-2 font-display text-3xl font-bold">
          Your <span className="text-gradient-gold">Application</span>
        </h1>
        <p className="mb-6 text-muted-foreground">Complete all sections to finalize. Your progress is saved automatically.</p>

        <div className="mb-8 flex gap-2">
          {steps.map((s, i) => (
            <div key={s} className={`flex-1 h-2 rounded-full ${step === s ? 'bg-primary' : i < steps.indexOf(step) ? 'bg-success' : 'bg-secondary'}`} />
          ))}
        </div>

        {step === 'section_a' && (
          <form onSubmit={handleSectionA} className="space-y-6">
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-display">Applicant Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input required value={form.nominator_name} onChange={e => updateForm('nominator_name', e.target.value)} className="mt-1.5 bg-secondary" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input required type="email" value={form.nominator_email} readOnly className="mt-1.5 bg-secondary/50 cursor-not-allowed" />
                  <p className="text-xs text-muted-foreground mt-1">Auto-filled from your account</p>
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
              <CardHeader><CardTitle className="font-display">School / Organisation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <Label>School/Organisation Name *</Label>
                    <Input required value={form.school_name} onChange={e => updateForm('school_name', e.target.value)} className="mt-1.5 bg-secondary" />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input required value={form.school_city} onChange={e => updateForm('school_city', e.target.value)} className="mt-1.5 bg-secondary" />
                  </div>
                  <div>
                    <Label>Country *</Label>
                    <Input required value={form.school_country} readOnly className="mt-1.5 bg-secondary/50 cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground mt-1">From your profile</p>
                  </div>
                  <div>
                    <Label>Institution Type *</Label>
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
                </div>

                <div className="border-t border-border pt-4">
                  <Label className="text-base font-semibold">Registration Documents *</Label>
                  <p className="text-xs text-muted-foreground mb-3">Upload your school/organisation registration certificate or proof of establishment.</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {orgFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button onClick={() => setOrgFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                    {existingDocs.filter(d => d.category === 'organization').map(doc => (
                      <div key={doc.id} className="flex items-center gap-2 bg-success/10 rounded-lg px-3 py-2 text-sm">
                        <FileText className="h-4 w-4 text-success" />
                        <span className="max-w-[150px] truncate">{doc.file_name}</span>
                      </div>
                    ))}
                  </div>
                  {orgFiles.length < 3 && (
                    <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80">
                      <Upload className="h-4 w-4" />
                      Upload registration document
                      <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => { if (e.target.files?.[0]) setOrgFiles(prev => [...prev, e.target.files![0]]); }} />
                    </Label>
                  )}
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
                  <div key={cat} className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCategories.includes(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                      disabled={!selectedCategories.includes(cat) && selectedCategories.length >= 3}
                      className="mt-0.5"
                    />
                    <div className="cursor-pointer" onClick={() => toggleCategory(cat)}>
                      <p className="text-sm font-medium">{cat}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORY_DOCUMENTS[cat]?.label}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent className="pt-6 space-y-4">
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

            <Button type="submit" className="w-full bg-gradient-gold text-lg font-semibold py-6" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save & Continue to Nominations'}
            </Button>
          </form>
        )}

        {step === 'nominations' && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Nomination Statements</CardTitle>
                <p className="text-sm text-muted-foreground">Write a nomination statement for each selected category (max 600 characters each).</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedCategories.map((cat, i) => (
                  <div key={cat} className="space-y-2">
                    <Label className="text-sm font-semibold">Category {i + 1}: {cat}</Label>
                    <Textarea
                      required
                      maxLength={600}
                      value={nominationStatements[cat] || ''}
                      onChange={e => setNominationStatements(prev => ({ ...prev, [cat]: e.target.value }))}
                      className="min-h-[120px] bg-secondary"
                      placeholder={`Describe why this nomination deserves recognition in "${cat}"...`}
                    />
                    <p className="text-xs text-muted-foreground text-right">{(nominationStatements[cat] || '').length}/600</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('section_a')}>Back</Button>
              <Button className="flex-1 bg-gradient-gold font-semibold" onClick={handleNominations}>Continue to Documents</Button>
            </div>
          </div>
        )}

        {step === 'section_b' && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Supporting Documents</CardTitle>
                <p className="text-sm text-muted-foreground">Upload the required documents for each category. At least 2 documents per category are recommended.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                {selectedCategories.map((cat, catIndex) => {
                  const catDocs = CATEGORY_DOCUMENTS[cat];
                  const existingCatDocs = existingDocs.filter(d => d.category === cat);
                  return (
                    <div key={cat} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
                      <h3 className="font-semibold text-sm">Category {catIndex + 1}: {cat}</h3>
                      {catDocs && (
                        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                          <p className="font-medium text-foreground">Required documents:</p>
                          {catDocs.docs.map((d, i) => (
                            <p key={i}>• {d}</p>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {existingCatDocs.map(doc => (
                          <div key={doc.id} className="flex items-center gap-2 bg-success/10 rounded-lg px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 text-success" />
                            <span className="max-w-[150px] truncate">{doc.file_name}</span>
                          </div>
                        ))}
                        {(categoryFiles[cat] || []).map((file, fi) => (
                          <div key={fi} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-sm">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button onClick={() => removeFile(cat, fi)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                      {((categoryFiles[cat]?.length || 0) + existingCatDocs.length) < 3 && (
                        <Label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:text-primary/80">
                          <Upload className="h-4 w-4" />
                          Upload document ({(categoryFiles[cat]?.length || 0) + existingCatDocs.length}/3)
                          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.csv" onChange={e => handleFileChange(cat, e.target.files)} />
                        </Label>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('nominations')}>Back</Button>
              <Button className="flex-1 bg-gradient-gold font-semibold" onClick={handleUploadDocuments} disabled={uploadingDocs}>
                {uploadingDocs ? 'Uploading...' : 'Upload & Continue'}
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && existingSubmission && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Application Fee — KES 1</CardTitle>
                <p className="text-sm text-muted-foreground">A nominal fee of KES 1 is required to finalize your application.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentStatus === 'completed' || paymentStatus === 'waived' ? (
                  <div className="rounded-lg bg-success/10 p-4 text-center">
                    <p className="text-success font-semibold text-lg">✅ Payment {paymentStatus === 'waived' ? 'Waived' : 'Confirmed'}</p>
                    <p className="text-muted-foreground text-sm mt-1">You can now proceed to review and submit.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-secondary p-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Application Fee</span>
                        <span className="font-semibold">KES 1.00</span>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Payment Methods</span>
                        <span>M-Pesa · Card · Bank Transfer</span>
                      </div>
                    </div>
                    <Button className="w-full bg-gradient-gold font-semibold py-6 text-lg" onClick={handlePayment} disabled={processingPayment}>
                      {processingPayment ? 'Processing...' : 'Proceed to Payment'}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Secure payment. Supports M-Pesa, Visa, Mastercard.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('section_b')}>Back</Button>
              {(paymentStatus === 'completed' || paymentStatus === 'waived') && (
                <Button className="flex-1 bg-gradient-gold font-semibold" onClick={() => setStep('review')}>Continue to Review</Button>
              )}
            </div>
          </div>
        )}

        {step === 'review' && existingSubmission && (
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-display">Review & Final Submission</CardTitle>
                <p className="text-sm text-muted-foreground">Review your application. Once submitted, you cannot make changes.</p>
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
                {selectedCategories.map(cat => (
                  <div key={cat}>
                    <span className="text-muted-foreground font-medium">{cat}:</span>
                    <p className="mt-1 text-xs">{nominationStatements[cat] || 'No statement'}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1 border-border" onClick={() => setStep('payment')}>Back</Button>
              <Button className="flex-1 bg-gradient-gold font-semibold text-lg py-6" onClick={handleFinalSubmit}>Submit Application</Button>
            </div>
          </div>
        )}

        {/* Document warning popup */}
        <Dialog open={showDocWarning} onOpenChange={setShowDocWarning}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Missing Documents
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Some categories have fewer than the recommended number of documents attached. We recommend uploading at least 2 documents per category for a stronger application.
            </p>
            <p className="text-sm text-muted-foreground">Would you like to continue anyway?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDocWarning(false)}>Go Back & Add More</Button>
              <Button className="flex-1 bg-gradient-gold" onClick={proceedWithWarning}>Continue Anyway</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
