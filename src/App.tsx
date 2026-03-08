import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SubmissionForm from "./pages/SubmissionForm";
import SubmitterSubmissions from "./pages/SubmitterSubmissions";
import JudgeSubmissions from "./pages/JudgeSubmissions";
import JudgeScores from "./pages/JudgeScores";
import SecretariatSubmissions from "./pages/SecretariatSubmissions";
import SecretariatScreening from "./pages/SecretariatScreening";
import SecretariatPanels from "./pages/SecretariatPanels";
import SecretariatRouting from "./pages/SecretariatRouting";
import SecretariatJudges from "./pages/SecretariatJudges";
import SecretariatScores from "./pages/SecretariatScores";
import SecretariatUsers from "./pages/SecretariatUsers";
import SecretariatStatistics from "./pages/SecretariatStatistics";
import SecretariatJudgeWorkRate from "./pages/SecretariatJudgeWorkRate";
import Rankings from "./pages/Rankings";
import NationalRankings from "./pages/NationalRankings";
import RegionalRankings from "./pages/RegionalRankings";
import ContinentalRankings from "./pages/ContinentalRankings";
import GlobalRankings from "./pages/GlobalRankings";
import AdminApprovals from "./pages/AdminApprovals";
import AdminJudgeApprovals from "./pages/AdminJudgeApprovals";
import AdminMessaging from "./pages/AdminMessaging";
import AdminFinance from "./pages/AdminFinance";
import NotificationsPage from "./pages/NotificationsPage";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/submissions" element={<ProtectedRoute allowedRoles={['submitter']}><SubmitterSubmissions /></ProtectedRoute>} />
          <Route path="/submissions/new" element={<ProtectedRoute allowedRoles={['submitter']}><SubmissionForm /></ProtectedRoute>} />
          <Route path="/judge/submissions" element={<ProtectedRoute allowedRoles={['judge']}><JudgeSubmissions /></ProtectedRoute>} />
          <Route path="/judge/scores" element={<ProtectedRoute allowedRoles={['judge']}><JudgeScores /></ProtectedRoute>} />
          <Route path="/secretariat/submissions" element={<ProtectedRoute allowedRoles={['secretariat', 'country_representative', 'super_admin']}><SecretariatSubmissions /></ProtectedRoute>} />
          <Route path="/secretariat/screening" element={<ProtectedRoute allowedRoles={['secretariat', 'country_representative', 'super_admin']}><SecretariatScreening /></ProtectedRoute>} />
          <Route path="/secretariat/panels" element={<ProtectedRoute allowedRoles={['secretariat', 'country_representative', 'super_admin']}><SecretariatPanels /></ProtectedRoute>} />
          <Route path="/secretariat/routing" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatRouting /></ProtectedRoute>} />
          <Route path="/secretariat/judges" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatJudges /></ProtectedRoute>} />
          <Route path="/secretariat/scores" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatScores /></ProtectedRoute>} />
          <Route path="/secretariat/users" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatUsers /></ProtectedRoute>} />
          <Route path="/secretariat/statistics" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatStatistics /></ProtectedRoute>} />
          <Route path="/secretariat/judge-work-rate" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><SecretariatJudgeWorkRate /></ProtectedRoute>} />
          <Route path="/secretariat/rankings" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><Rankings /></ProtectedRoute>} />
          <Route path="/secretariat/rankings/national" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><NationalRankings /></ProtectedRoute>} />
          <Route path="/secretariat/rankings/regional" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><RegionalRankings /></ProtectedRoute>} />
          <Route path="/secretariat/rankings/continental" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><ContinentalRankings /></ProtectedRoute>} />
          <Route path="/secretariat/rankings/global" element={<ProtectedRoute allowedRoles={['secretariat', 'super_admin']}><GlobalRankings /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminApprovals /></ProtectedRoute>} />
          <Route path="/admin/judge-applications" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminJudgeApprovals /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><SecretariatSubmissions /></ProtectedRoute>} />
          <Route path="/admin/messaging" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminMessaging /></ProtectedRoute>} />
          <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminFinance /></ProtectedRoute>} />
          <Route path="/admin/rankings" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><Rankings /></ProtectedRoute>} />
          <Route path="/admin/scores" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><SecretariatScores /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
