import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, Trophy, Award, Medal, Globe, BadgeCheck, Mic, BookOpen, Star, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function SubmitterDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0 });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('status, approval_status')
        .eq('submitter_id', user.id);
      if (data) {
        setStats({
          total: data.length,
          submitted: data.filter(s => s.status !== 'draft').length,
          approved: data.filter(s => s.approval_status === 'approved').length,
        });
        // Check if any non-draft submission exists
        setHasSubmitted(data.some(s => s.status !== 'draft'));
      }
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { label: 'Total Applications', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Under Review', value: stats.submitted, icon: Clock, color: 'text-warning' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success' },
  ];

  const winnerBenefits = [
    { id: 'certificate', icon: BadgeCheck, title: '1. Official TEGA Winner Digital Certificate', items: ['Personalized, high-resolution downloadable certificate', 'Signed and digitally authenticated', 'Category and award level clearly indicated (Global / Regional / National)', 'Unique verification ID for authenticity confirmation'], suitable: ['Website display', 'LinkedIn profiles', 'Institutional communication', 'Ministry submissions', 'Marketing materials'], note: 'Certificates are delivered within 7 days after the awards gala.' },
    { id: 'trophy', icon: Trophy, title: '2. Premium Physical Trophy (Shipped)', items: ['Custom-engraved winner name', 'Award category inscribed', 'Award level clearly stated', 'Year of award', 'Official TEGA branding'], note: 'Trophies are securely packaged and shipped internationally. Estimated delivery: 2–4 weeks. Shipping costs are covered.' },
    { id: 'media', icon: Globe, title: '3. Global Recognition & Media Exposure', items: ['Featured on the official TEGA website', 'Highlighted on TEGA social media platforms', 'Included in the official TEGA Winners Directory', 'Announced during the virtual awards gala', 'Included in post-event press releases'], enhances: ['Institutional credibility', 'Investor confidence', 'Ministry recognition', 'Community trust'] },
    { id: 'badge', icon: Medal, title: '4. Official Winner Badge (Digital Use License)', items: ['School websites', 'Email signatures', 'Prospectuses', 'Institutional banners', 'Social media profiles'], note: 'Usage is subject to brand compliance guidelines.' },
    { id: 'gala', icon: Mic, title: '5. Global Awards Ceremony Recognition', items: ['Formally announced during the live virtual gala', 'Impact story highlighted', 'Formal commendation from the judging panel', 'Selected winners may give brief acceptance remarks'] },
    { id: 'legacy', icon: BookOpen, title: '6. Long-Term Legacy Listing', items: ['Permanently listed in the TEGA Global Impact Registry', 'Historical recognition', 'Institutional prestige', 'Public verification of award status'] },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Welcome, <span className="text-gradient-gold">{profile?.full_name}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your TEGA award applications</p>
        </div>
        {!hasSubmitted && (
          <Link to="/submissions/new">
            <Button className="bg-gradient-gold gap-2 font-semibold">
              <Award className="h-4 w-4" />
              New Application
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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

      {/* What Winners Receive */}
      <Card className="glass-card border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-xl">
                What Winners of <span className="text-gradient-gold">TEGA</span> Receive
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Winning a TEGA Award is more than recognition — it is global validation, credibility, and legacy positioning.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {winnerBenefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <AccordionItem key={benefit.id} value={benefit.id} className="border border-border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 text-left">
                      <Icon className="h-5 w-5 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{benefit.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <ul className="space-y-1.5 ml-8">
                      {benefit.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 mt-1 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    {'suitable' in benefit && benefit.suitable && (
                      <div className="ml-8 mt-3">
                        <p className="text-xs font-medium text-foreground mb-1">Suitable for:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {benefit.suitable.map((s, i) => (
                            <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {'enhances' in benefit && benefit.enhances && (
                      <div className="ml-8 mt-3">
                        <p className="text-xs font-medium text-foreground mb-1">This enhances:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {benefit.enhances.map((e, i) => (
                            <span key={i} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">{e}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {benefit.note && <p className="ml-8 mt-3 text-xs text-muted-foreground italic">{benefit.note}</p>}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-primary" />
              Additional Recognition (Where Applicable)
            </h4>
            <p className="text-xs text-muted-foreground mb-2">Depending on category and level:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {['Special Commendation Certificates', 'Innovation Spotlight Feature', 'Invitation to TEGA Advisory Roundtables', 'Future Judging Panel Consideration'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-success shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
