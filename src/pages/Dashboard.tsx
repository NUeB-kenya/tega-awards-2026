import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import SubmitterDashboard from '@/components/dashboards/SubmitterDashboard';
import JudgeDashboard from '@/components/dashboards/JudgeDashboard';
import SecretariatDashboard from '@/components/dashboards/SecretariatDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';
import JudgeOnboarding from '@/components/JudgeOnboarding';

export default function Dashboard() {
  const { role, profile, user } = useAuth();
  const [judgeApp, setJudgeApp] = useState<any>(undefined);
  const accountType = profile?.account_type || user?.user_metadata?.account_type || 'applicant';

  useEffect(() => {
    if (!user || accountType === 'applicant') {
      setJudgeApp(null);
      return;
    }
    const fetchApp = async () => {
      const { data } = await supabase
        .from('judge_applications' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setJudgeApp(data);
    };
    fetchApp();
  }, [user, accountType]);

  // If judge/representative applicant and not yet approved, show onboarding
  if ((accountType === 'judge' || accountType === 'country_representative') && role === 'submitter') {
    if (judgeApp === undefined) {
      return (
        <DashboardLayout>
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </DashboardLayout>
      );
    }
    if (!judgeApp || judgeApp.status === 'pending' || judgeApp.status === 'rejected') {
      return (
        <DashboardLayout>
          <JudgeOnboarding existingApplication={judgeApp} applicationType={accountType} />
        </DashboardLayout>
      );
    }
  }

  return (
    <DashboardLayout>
      {(role === 'submitter') && <SubmitterDashboard />}
      {(role === 'judge') && <JudgeDashboard />}
      {(role === 'secretariat' || role === 'country_representative') && <SecretariatDashboard />}
      {(role === 'admin' || role === 'super_admin') && <AdminDashboard />}
      {!role && (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading role information...</p>
        </div>
      )}
    </DashboardLayout>
  );
}
