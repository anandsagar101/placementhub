import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import {
  FileText, Briefcase, CheckCircle2, Trophy, Loader2, ArrowRight, Award,
  ShieldCheck, ShieldAlert, Snowflake, Clock, XCircle, CalendarClock, Rocket, FolderOpen,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCard, PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);
const COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#6366f1", "#10b981", "#f43f5e"];

const VERIF_UI = {
  approved: { icon: ShieldCheck, cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600", title: "Profile Verified", msg: "You're all set to apply to jobs." },
  pending: { icon: Clock, cls: "border-blue-500/30 bg-blue-500/10 text-blue-600", title: "Verification Pending", msg: "Complete your profile & documents. Admin will review shortly." },
  rejected: { icon: XCircle, cls: "border-rose-500/30 bg-rose-500/10 text-rose-600", title: "Verification Rejected", msg: "Please review remarks and re-submit your documents." },
  changes_requested: { icon: ShieldAlert, cls: "border-amber-500/30 bg-amber-500/10 text-amber-600", title: "Changes Requested", msg: "Admin requested changes. Update your profile/documents." },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: stats } = useSWR("/student/stats", fetcher);
  const { data: apps, isLoading } = useSWR("/applications/me", fetcher);
  const { data: timeline } = useSWR("/student/timeline", fetcher);

  const pieData = (stats?.status_distribution || []).filter((s) => s.count > 0);
  const completion = stats?.profile_completion || user?.profile_completion;
  const verif = VERIF_UI[stats?.verification_status] || VERIF_UI.pending;

  return (
    <div>
      <PageHeader title={`Hi ${user?.name?.split(" ")[0]} 👋`} subtitle="Here's your placement snapshot and latest activity.">
        <Link to="/app/jobs"><Button className="rounded-full" data-testid="browse-jobs-cta"><Briefcase className="mr-2 h-4 w-4" /> Browse jobs</Button></Link>
      </PageHeader>

      {/* Freeze banner */}
      {stats?.frozen && stats?.freeze_reason !== "Already Placed" && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-600" data-testid="freeze-banner">
          <Snowflake className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Account Frozen</p>
            <p className="text-sm">Reason: {stats.freeze_reason}. You cannot apply or accept offers while frozen.</p>
          </div>
        </div>
      )}
      {stats?.placed && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600" data-testid="placed-banner">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Congratulations, you're placed! 🎉</p>
            <p className="text-sm">Only higher-package Dream Company drives remain available.</p>
          </div>
        </div>
      )}

      {/* Verification + completion row */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className={cn("flex items-start gap-3 rounded-xl border p-5", verif.cls)} data-testid="verification-banner">
          <verif.icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-heading font-semibold">{verif.title}</p>
            <p className="mt-0.5 text-sm opacity-90">{verif.msg}</p>
            {user?.verification_remarks && <p className="mt-1 text-xs opacity-80">Remark: {user.verification_remarks}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-heading font-semibold">Profile Completion</p>
            <span className="font-heading text-lg font-bold text-primary">{completion?.percentage ?? 0}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted">
            <div className="h-2.5 rounded-full bg-primary transition-all duration-500" style={{ width: `${completion?.percentage ?? 0}%` }} data-testid="completion-bar" />
          </div>
          {completion?.missing?.length > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Missing: {completion.missing.slice(0, 6).join(", ")}
              {completion.missing.length > 6 ? "…" : ""} —{" "}
              <Link to="/app/profile" className="font-medium text-primary hover:underline">complete now</Link>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Applications" value={stats?.total_applications ?? "—"} accent="primary" testid="stat-applications" />
        <StatCard icon={CheckCircle2} label="Shortlisted" value={stats?.shortlisted ?? "—"} accent="violet" testid="stat-shortlisted" />
        <StatCard icon={Award} label="Offers" value={stats?.offers ?? "—"} accent="success" testid="stat-offers" />
        <StatCard icon={Briefcase} label="Open Jobs" value={stats?.open_jobs ?? "—"} accent="warning" testid="stat-open-jobs" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link to="/app/interviews" className="block"><StatCard icon={CalendarClock} label="Upcoming Interviews" value={stats?.upcoming_interviews ?? "—"} accent="primary" testid="stat-upcoming-interviews" /></Link>
        <Link to="/app/drives" className="block"><StatCard icon={Rocket} label="Open Drives" value={stats?.upcoming_drives ?? "—"} accent="violet" testid="stat-upcoming-drives" /></Link>
        <Link to="/app/documents" className="block"><StatCard icon={FolderOpen} label="Pending Documents" value={stats?.pending_documents ?? "—"} accent="warning" testid="stat-pending-docs" /></Link>
      </div>

      {/* Placement journey timeline */}
      {timeline && (
        <div className="mt-6 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-5 font-heading text-lg font-semibold">Your placement journey</h3>
          <div className="flex flex-wrap items-center gap-y-4">
            {timeline.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1.5" data-testid={`timeline-${s.key}`}>
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2",
                    s.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground")}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                  </div>
                  <span className={cn("max-w-[70px] text-center text-[11px] leading-tight", s.done ? "font-medium text-foreground" : "text-muted-foreground")}>{s.label}</span>
                </div>
                {i < timeline.length - 1 && <div className={cn("h-0.5 min-w-[16px] flex-1", s.done ? "bg-primary" : "bg-border")} />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Recent applications</h3>
            <Link to="/app/applications" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : apps?.length ? (
            <div className="divide-y divide-border">
              {apps.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{a.job?.title || "Job"}</p>
                    <p className="text-sm text-muted-foreground">{a.job?.company_name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FileText} title="No applications yet" subtitle="Start applying to jobs to see them here." />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-heading text-lg font-semibold">Application status</h3>
          {pieData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
