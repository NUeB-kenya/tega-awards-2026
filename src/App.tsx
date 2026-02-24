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
import SecretariatJudges from "./pages/SecretariatJudges";
import SecretariatScores from "./pages/SecretariatScores";
import SecretariatUsers from "./pages/SecretariatUsers";
import SecretariatStatistics from "./pages/SecretariatStatistics";
import AdminApprovals from "./pages/AdminApprovals";
import AdminMessaging from "./pages/AdminMessaging";
import ProtectedRoute from "./components/ProtectedRoute";
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
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/submissions" element={<ProtectedRoute allowedRoles={['submitter']}><SubmitterSubmissions /></ProtectedRoute>} />
          <Route path="/submissions/new" element={<ProtectedRoute allowedRoles={['submitter']}><SubmissionForm /></ProtectedRoute>} />
          <Route path="/judge/submissions" element={<ProtectedRoute allowedRoles={['judge']}><JudgeSubmissions /></ProtectedRoute>} />
          <Route path="/judge/scores" element={<ProtectedRoute allowedRoles={['judge']}><JudgeScores /></ProtectedRoute>} />
          <Route path="/secretariat/submissions" element={<ProtectedRoute allowedRoles={['secretariat']}><SecretariatSubmissions /></ProtectedRoute>} />
          <Route path="/secretariat/judges" element={<ProtectedRoute allowedRoles={['secretariat']}><SecretariatJudges /></ProtectedRoute>} />
          <Route path="/secretariat/scores" element={<ProtectedRoute allowedRoles={['secretariat']}><SecretariatScores /></ProtectedRoute>} />
          <Route path="/secretariat/users" element={<ProtectedRoute allowedRoles={['secretariat']}><SecretariatUsers /></ProtectedRoute>} />
          <Route path="/secretariat/statistics" element={<ProtectedRoute allowedRoles={['secretariat']}><SecretariatStatistics /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin']}><AdminApprovals /></ProtectedRoute>} />
          <Route path="/admin/submissions" element={<ProtectedRoute allowedRoles={['admin']}><SecretariatSubmissions /></ProtectedRoute>} />
          <Route path="/admin/messaging" element={<ProtectedRoute allowedRoles={['admin']}><AdminMessaging /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
