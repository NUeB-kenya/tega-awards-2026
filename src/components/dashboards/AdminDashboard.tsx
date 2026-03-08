import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, CheckCircle, Clock, XCircle, Shield, Users, Award, Gavel, DollarSign, Settings, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, total: 0, paid: 0, screened: 0, assigned: 0, scored: 0 });
  const [judgeStats, setJudgeStats] = useState({ totalJudges: 0, pendingJudgeApps: 0, approvedJudgeApps: 0, rejectedJudgeApps: 0 });
  const [userStats, setUserStats] = useState({ totalUsers: 0, applicants: 0, judges: 0, secretariat: 0, admins: 0, representatives: 0 });
  const [feeSettings, setFeeSettings] = useState<any>({ submission_fee: { amount: 1, currency: 'KES' }, approval_fee: { amount: 0, currency: 'KES' } });
  const [exchangeRates, setExchangeRates] = useState<any>({ USD_KES: 130, EUR_KES: 142, GBP_KES: 165, ZAR_KES: 7.2, NGN_KES: 0.085 });
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editFee, setEditFee] = useState({ type: '', amount: '', currency: 'KES' });
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [editRates, setEditRates] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const [subsRes, rolesRes, judgeAppsRes, settingsRes] = await Promise.all([
        supabase.from('submissions').select('approval_status, status'),
        supabase.from('user_roles').select('role'),
        supabase.from('judge_applications' as any).select('status'),
        supabase.from('platform_settings' as any).select('key, value'),
      ]);

      const subs = subsRes.data || [];
      setStats({
        total: subs.length,
        pending: subs.filter((s: any) => s.approval_status === 'pending').length,
        approved: subs.filter((s: any) => s.approval_status === 'approved').length,
        declined: subs.filter((s: any) => s.approval_status === 'declined').length,
        paid: subs.filter((s: any) => s.status === 'paid').length,
        screened: subs.filter((s: any) => s.status === 'screened').length,
        assigned: subs.filter((s: any) => s.status === 'assigned').length,
        scored: subs.filter((s: any) => s.status === 'scored').length,
      });

      const roles = rolesRes.data || [];
      setUserStats({
        totalUsers: roles.length,
        applicants: roles.filter((r: any) => r.role === 'submitter').length,
        judges: roles.filter((r: any) => r.role === 'judge').length,
        secretariat: roles.filter((r: any) => r.role === 'secretariat').length,
        admins: roles.filter((r: any) => r.role === 'admin' || r.role === 'super_admin').length,
        representatives: roles.filter((r: any) => r.role === 'country_representative').length,
      });

      const judgeApps = (judgeAppsRes.data || []) as any[];
      setJudgeStats({
        totalJudges: roles.filter((r: any) => r.role === 'judge').length,
        pendingJudgeApps: judgeApps.filter((a: any) => a.status === 'pending').length,
        approvedJudgeApps: judgeApps.filter((a: any) => a.status === 'approved').length,
        rejectedJudgeApps: judgeApps.filter((a: any) => a.status === 'rejected').length,
      });

      const settings = (settingsRes.data || []) as any[];
      settings.forEach((s: any) => {
        if (s.key === 'submission_fee') setFeeSettings((prev: any) => ({ ...prev, submission_fee: s.value }));
        if (s.key === 'approval_fee') setFeeSettings((prev: any) => ({ ...prev, approval_fee: s.value }));
        if (s.key === 'exchange_rates') setExchangeRates(s.value);
      });
    };
    fetchAll();
  }, []);

  const saveFee = async () => {
    const key = editFee.type === 'submission' ? 'submission_fee' : 'approval_fee';
    const newValue = { amount: Number(editFee.amount), currency: editFee.currency };
    // Use upsert: try update first, if no rows matched, insert
    const { data: existing } = await (supabase.from('platform_settings' as any) as any).select('id').eq('key', key).maybeSingle();
    if (existing) {
      await (supabase.from('platform_settings' as any) as any).update({ value: newValue, updated_at: new Date().toISOString() }).eq('key', key);
    } else {
      await (supabase.from('platform_settings' as any) as any).insert({ key, value: newValue });
    }
    setFeeSettings((prev: any) => ({ ...prev, [key]: newValue }));
    setShowFeeDialog(false);
    toast({ title: 'Fee updated successfully' });
  };

  const saveRates = async () => {
    const ratesObj: Record<string, number> = {};
    Object.entries(editRates).forEach(([k, v]) => { ratesObj[k] = Number(v); });
    const { data: existing } = await (supabase.from('platform_settings' as any) as any).select('id').eq('key', 'exchange_rates').maybeSingle();
    if (existing) {
      await (supabase.from('platform_settings' as any) as any).update({ value: ratesObj, updated_at: new Date().toISOString() }).eq('key', 'exchange_rates');
    } else {
      await (supabase.from('platform_settings' as any) as any).insert({ key: 'exchange_rates', value: ratesObj });
    }
    setExchangeRates(ratesObj);
    setShowRateDialog(false);
    toast({ title: 'Exchange rates updated' });
  };

  const renderCardGrid = (cards: any[]) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map(stat => {
        const Icon = stat.icon;
        const Wrapper = stat.href ? Link : 'div';
        return (
          <Wrapper key={stat.label} to={stat.href || '#'} className={stat.href ? 'block' : ''}>
            <Card className={`glass-card ${stat.href ? 'hover:border-primary/30 cursor-pointer' : ''} transition-colors`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                {Icon && <Icon className={`h-5 w-5 ${stat.color}`} />}
              </CardHeader>
              <CardContent><p className="text-3xl font-bold">{stat.value}</p></CardContent>
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold"><span className="text-gradient-gold">Admin</span> Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Welcome, {profile?.full_name} · Full system overview</p>
      </div>

      {/* Submission Applications */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">📋 Submission Applications</h2>
        {renderCardGrid([
          { label: 'Total Applications', value: stats.total, icon: FileText, color: 'text-primary', href: '/admin/submissions' },
          { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'text-warning', href: '/admin/approvals' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-success', href: '/admin/submissions' },
          { label: 'Declined', value: stats.declined, icon: XCircle, color: 'text-destructive', href: '/admin/approvals' },
        ])}
      </div>

      {/* Judge Applications - separate section */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">⚖️ Judge Applications</h2>
        {renderCardGrid([
          { label: 'Pending Review', value: judgeStats.pendingJudgeApps, icon: Clock, color: 'text-warning', href: '/admin/judge-applications' },
          { label: 'Approved Judges', value: judgeStats.approvedJudgeApps, icon: CheckCircle, color: 'text-success', href: '/admin/judge-applications' },
          { label: 'Rejected', value: judgeStats.rejectedJudgeApps, icon: XCircle, color: 'text-destructive', href: '/admin/judge-applications' },
          { label: 'Active Judges', value: judgeStats.totalJudges, icon: Gavel, color: 'text-primary' },
        ])}
      </div>

      {/* Pipeline */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Pipeline</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Paid', value: stats.paid, color: 'text-success' },
            { label: 'Screened', value: stats.screened, color: 'text-primary' },
            { label: 'Assigned', value: stats.assigned, color: 'text-accent' },
            { label: 'Scored', value: stats.scored, color: 'text-warning' },
          ].map(c => (
            <Card key={c.label} className="glass-card">
              <CardContent className="pt-6 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Users Overview */}
      <div>
        <h2 className="font-display text-lg font-semibold mb-3">Users Overview</h2>
        {renderCardGrid([
          { label: 'Total Users', value: userStats.totalUsers, icon: Users, color: 'text-primary' },
          { label: 'Applicants', value: userStats.applicants, icon: FileText, color: 'text-success' },
          { label: 'Country Reps', value: userStats.representatives, icon: Shield, color: 'text-accent' },
          { label: 'Secretariat + Admins', value: userStats.secretariat + userStats.admins, icon: Settings, color: 'text-muted-foreground' },
        ])}
      </div>

      {/* Rankings Quick Link */}
      <div>
        <Link to="/admin/rankings">
          <Card className="glass-card hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-4">
              <Trophy className="h-8 w-8 text-amber-400" />
              <div>
                <p className="font-display font-bold text-lg">Rankings & Leaderboard</p>
                <p className="text-sm text-muted-foreground">View Country → Continental → Regional → Global rankings</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Fee Management */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold">Fee & Currency Management</h2>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setEditRates(Object.fromEntries(Object.entries(exchangeRates).map(([k, v]) => [k, String(v)]))); setShowRateDialog(true); }}>
            <Settings className="h-3.5 w-3.5" /> Edit Rates
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setEditFee({ type: 'submission', amount: String(feeSettings.submission_fee?.amount || 1), currency: feeSettings.submission_fee?.currency || 'KES' }); setShowFeeDialog(true); }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Submission Fee</CardTitle>
              <DollarSign className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{feeSettings.submission_fee?.currency} {feeSettings.submission_fee?.amount}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </CardContent>
          </Card>
          <Card className="glass-card cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setEditFee({ type: 'approval', amount: String(feeSettings.approval_fee?.amount || 0), currency: feeSettings.approval_fee?.currency || 'KES' }); setShowFeeDialog(true); }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approval Fee</CardTitle>
              <DollarSign className="h-5 w-5 text-warning" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{feeSettings.approval_fee?.currency} {feeSettings.approval_fee?.amount}</p>
              <p className="text-xs text-muted-foreground mt-1">Click to edit</p>
            </CardContent>
          </Card>
          {Object.entries(exchangeRates).slice(0, 2).map(([pair, rate]) => (
            <Card key={pair} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{pair.replace('_', ' → ')}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{String(rate)}</p></CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Fee Dialog */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Edit {editFee.type === 'submission' ? 'Submission' : 'Approval'} Fee</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Amount</Label><Input type="number" min={0} value={editFee.amount} onChange={e => setEditFee(p => ({ ...p, amount: e.target.value }))} className="mt-1 bg-secondary" /></div>
            <div>
              <Label>Currency</Label>
              <Select value={editFee.currency} onValueChange={v => setEditFee(p => ({ ...p, currency: v }))}>
                <SelectTrigger className="mt-1 bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>{['KES', 'USD', 'EUR', 'GBP', 'ZAR'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-gradient-gold font-semibold" onClick={saveFee}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rates Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Exchange Rates</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {Object.entries(editRates).map(([pair, rate]) => (
              <div key={pair}><Label>{pair.replace('_', ' → ')}</Label><Input type="number" step="0.01" value={rate} onChange={e => setEditRates(p => ({ ...p, [pair]: e.target.value }))} className="mt-1 bg-secondary" /></div>
            ))}
            <Button className="w-full bg-gradient-gold font-semibold" onClick={saveRates}>Save Rates</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
