import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import DashboardLayout from "@/components/DashboardLayout";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Profile from "@/pages/Profile";
import ManageJobs from "@/pages/ManageJobs";

import StudentDashboard from "@/pages/student/StudentDashboard";
import BrowseJobs from "@/pages/student/BrowseJobs";
import MyApplications from "@/pages/student/MyApplications";
import Offers from "@/pages/student/Offers";
import Documents from "@/pages/student/Documents";
import AiInsights from "@/pages/student/AiInsights";

import CompanyDashboard from "@/pages/company/CompanyDashboard";
import PostJob from "@/pages/company/PostJob";
import Applicants from "@/pages/company/Applicants";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminCompanies from "@/pages/admin/AdminCompanies";
import AuditLogs from "@/pages/admin/AuditLogs";
import Staff from "@/pages/admin/Staff";

function FullLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function RoleRoute({ map }) {
  const { user } = useAuth();
  const El = map[user?.role];
  if (!El) return <Navigate to="/app" replace />;
  return <El />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Auth mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Auth mode="register" /></GuestOnly>} />

      <Route path="/app" element={<Protected><DashboardLayout><Outlet /></DashboardLayout></Protected>}>
        <Route index element={<RoleRoute map={{ student: StudentDashboard, company: CompanyDashboard, admin: AdminDashboard }} />} />
        <Route path="jobs" element={<RoleRoute map={{ student: BrowseJobs, company: ManageJobs, admin: ManageJobs }} />} />
        <Route path="ai" element={<RoleRoute map={{ student: AiInsights }} />} />
        <Route path="applications" element={<RoleRoute map={{ student: MyApplications }} />} />
        <Route path="offers" element={<RoleRoute map={{ student: Offers }} />} />
        <Route path="documents" element={<RoleRoute map={{ student: Documents }} />} />
        <Route path="post-job" element={<RoleRoute map={{ company: PostJob }} />} />
        <Route path="applicants" element={<RoleRoute map={{ company: Applicants }} />} />
        <Route path="students" element={<RoleRoute map={{ admin: AdminStudents }} />} />
        <Route path="companies" element={<RoleRoute map={{ admin: AdminCompanies }} />} />
        <Route path="audit" element={<RoleRoute map={{ admin: AuditLogs }} />} />
        <Route path="staff" element={<RoleRoute map={{ admin: Staff }} />} />
        <Route path="profile" element={<RoleRoute map={{ student: Profile, company: Profile }} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors closeButton />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
