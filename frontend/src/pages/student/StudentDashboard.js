import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import {
  FileText, Briefcase, CheckCircle2, Trophy, Loader2, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCard, PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";

const fetcher = (url) => api.get(url).then((r) => r.data);
const COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#6366f1", "#10b981", "#f43f5e"];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data: stats } = useSWR("/student/stats", fetcher);
  const { data: apps, isLoading } = useSWR("/applications/me", fetcher);

  const pieData = (stats?.status_distribution || []).filter((s) => s.count > 0);

  return (
    <div>
      <PageHeader
        title={`Hi ${user?.name?.split(" ")[0]} 👋`}
        subtitle="Here's your placement snapshot and latest application activity."
      >
        <Link to="/app/jobs"><Button className="rounded-full" data-testid="browse-jobs-cta"><Briefcase className="mr-2 h-4 w-4" /> Browse jobs</Button></Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FileText} label="Applications" value={stats?.total_applications ?? "—"} accent="primary" testid="stat-applications" />
        <StatCard icon={CheckCircle2} label="Shortlisted" value={stats?.shortlisted ?? "—"} accent="violet" testid="stat-shortlisted" />
        <StatCard icon={Trophy} label="Offers" value={stats?.selected ?? "—"} accent="success" testid="stat-offers" />
        <StatCard icon={Briefcase} label="Open Jobs" value={stats?.open_jobs ?? "—"} accent="warning" testid="stat-open-jobs" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Recent applications</h3>
            <Link to="/app/applications" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
