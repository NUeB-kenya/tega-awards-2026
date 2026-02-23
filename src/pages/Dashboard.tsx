import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import SubmitterDashboard from '@/components/dashboards/SubmitterDashboard';
import JudgeDashboard from '@/components/dashboards/JudgeDashboard';
import SecretariatDashboard from '@/components/dashboards/SecretariatDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {role === 'submitter' && <SubmitterDashboard />}
      {role === 'judge' && <JudgeDashboard />}
      {role === 'secretariat' && <SecretariatDashboard />}
      {!role && (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading role information...</p>
        </div>
      )}
    </DashboardLayout>
  );
}
