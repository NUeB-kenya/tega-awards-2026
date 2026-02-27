import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import SubmitterDashboard from '@/components/dashboards/SubmitterDashboard';
import JudgeDashboard from '@/components/dashboards/JudgeDashboard';
import SecretariatDashboard from '@/components/dashboards/SecretariatDashboard';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  return (
    <DashboardLayout>
      {(role === 'submitter') && <SubmitterDashboard />}
      {(role === 'judge' || role === 'panel_chair' || role === 'global_jury') && <JudgeDashboard />}
      {(role === 'secretariat' || role === 'country_coordinator') && <SecretariatDashboard />}
      {(role === 'admin' || role === 'super_admin') && <AdminDashboard />}
      {!role && (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Loading role information...</p>
        </div>
      )}
    </DashboardLayout>
  );
}
