import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  GraduationCap, LayoutDashboard, Briefcase, FileText, User, Building2,
  PlusCircle, Users, ClipboardList, Moon, Sun, LogOut, Menu, Sparkles,
  Award, FolderOpen, ScrollText, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const NAV = {
  student: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/jobs", label: "Browse Jobs", icon: Briefcase },
    { to: "/app/ai", label: "AI Insights", icon: Sparkles },
    { to: "/app/applications", label: "My Applications", icon: FileText },
    { to: "/app/offers", label: "Offers", icon: Award },
    { to: "/app/documents", label: "Documents", icon: FolderOpen },
    { to: "/app/profile", label: "My Profile", icon: User },
  ],
  company: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/jobs", label: "My Jobs", icon: Briefcase },
    { to: "/app/post-job", label: "Post a Job", icon: PlusCircle },
    { to: "/app/applicants", label: "Applicants", icon: ClipboardList },
    { to: "/app/profile", label: "Company Profile", icon: Building2 },
  ],
  admin: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/app/jobs", label: "All Jobs", icon: Briefcase },
    { to: "/app/students", label: "Students", icon: GraduationCap },
    { to: "/app/companies", label: "Companies", icon: Building2 },
    { to: "/app/audit", label: "Audit Logs", icon: ScrollText, perm: "view_audit" },
    { to: "/app/staff", label: "Staff & Roles", icon: ShieldCheck, superOnly: true },
  ],
};

const ADMIN_ROLE_LABEL = {
  super_admin: "Super Admin", placement_officer: "Placement Officer", department_coordinator: "Dept Coordinator",
};
const ROLE_LABEL = { student: "Student", company: "Recruiter", admin: "Placement Cell" };
const AUDIT_ROLES = new Set(["super_admin", "placement_officer"]);

function initials(name = "") {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "U";
}

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const adminRole = user?.admin_role;
  const nav = (NAV[user?.role] || []).filter((item) => {
    if (item.superOnly) return adminRole === "super_admin";
    if (item.perm === "view_audit") return AUDIT_ROLES.has(adminRole);
    return true;
  });

  const doLogout = async () => {
    await logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GraduationCap className="h-4.5 w-4.5" />
        </div>
        <span className="font-heading text-lg font-bold tracking-tight">PlacementHub</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {user?.role === "admin" ? (ADMIN_ROLE_LABEL[adminRole] || "Placement Cell") : ROLE_LABEL[user?.role]}
        </p>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <item.icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <button
          onClick={toggle}
          data-testid="sidebar-theme-toggle"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-card">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border lg:hidden"
              onClick={() => setOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="hidden text-sm text-muted-foreground sm:block">
              Welcome back, <span className="font-semibold text-foreground">{user?.name?.split(" ")[0]}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 transition-colors hover:bg-muted" data-testid="user-menu-btn">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {initials(user?.name)}
                </div>
                <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={doLogout} data-testid="logout-btn" className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
