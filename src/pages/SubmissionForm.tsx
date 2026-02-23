import { useState } from 'react';
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
import { ArrowLeft } from 'lucide-react';

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

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : prev.length < 3 ? [...prev, cat] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (selectedCategories.length === 0) {
      toast({ title: 'Select at least one award category', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('submissions').insert({
      submitter_id: user.id,
      ...form,
      award_categories: selectedCategories,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Submission created successfully!' });
      navigate('/submissions');
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl animate-fade-in">
        <Button variant="ghost" className="mb-4 gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="mb-2 font-display text-3xl font-bold">
          Nominate Your <span className="text-gradient-gold">School</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Complete the form below to submit for the TEGA Awards.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="glass-card">
            <CardHeader><CardTitle className="font-display">Nominator Information</CardTitle></CardHeader>
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
                <Textarea
                  required
                  maxLength={600}
                  value={form.nomination_statement}
                  onChange={e => updateForm('nomination_statement', e.target.value)}
                  className="mt-1.5 min-h-[120px] bg-secondary"
                />
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

          <Button type="submit" className="w-full bg-gradient-gold text-lg font-semibold py-6" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Nomination'}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
