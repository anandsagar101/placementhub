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

import CompanyDashboard from "@/pages/company/CompanyDashboard";
import PostJob from "@/pages/company/PostJob";
import Applicants from "@/pages/company/Applicants";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageUsers from "@/pages/admin/ManageUsers";

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

      <Route
        path="/app"
        element={<Protected><DashboardLayout><Outlet /></DashboardLayout></Protected>}
      >
        <Route index element={<RoleRoute map={{ student: StudentDashboard, company: CompanyDashboard, admin: AdminDashboard }} />} />
        <Route path="jobs" element={<RoleRoute map={{ student: BrowseJobs, company: ManageJobs, admin: ManageJobs }} />} />
        <Route path="applications" element={<RoleRoute map={{ student: MyApplications }} />} />
        <Route path="post-job" element={<RoleRoute map={{ company: PostJob }} />} />
        <Route path="applicants" element={<RoleRoute map={{ company: Applicants }} />} />
        <Route path="students" element={<RoleRoute map={{ admin: () => <ManageUsers role="student" /> }} />} />
        <Route path="companies" element={<RoleRoute map={{ admin: () => <ManageUsers role="company" /> }} />} />
        <Route path="profile" element={<RoleRoute map={{ student: Profile, company: Profile }} />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// end routes

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
