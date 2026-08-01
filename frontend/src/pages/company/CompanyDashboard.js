import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import {
  Briefcase, Users, CheckCircle2, UserCheck, PlusCircle, ArrowRight, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatCard, PageHeader, StatusBadge, EmptyState } from "@/components/shared";
import { STATUS_META } from "@/components/shared";
import { Button } from "@/components/ui/button";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function CompanyDashboard() {
  const { user } = useAuth();
  const { data: stats } = useSWR("/company/stats", fetcher);
  const { data: apps, isLoading } = useSWR("/applications/received", fetcher);

  const chartData = (stats?.status_distribution || []).map((s) => ({
    name: STATUS_META[s.status]?.label || s.status,
    count: s.count,
  }));

  return (
    <div>
      <PageHeader
        title={`${user?.company_name || user?.name}`}
        subtitle="Manage your job postings and hiring pipeline."
      >
        <Link to="/app/post-job"><Button className="rounded-full" data-testid="post-job-cta"><PlusCircle className="mr-2 h-4 w-4" /> Post a job</Button></Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Briefcase} label="Active Jobs" value={stats?.active_jobs ?? "—"} accent="primary" testid="stat-active-jobs" />
        <StatCard icon={Users} label="Applicants" value={stats?.total_applications ?? "—"} accent="violet" testid="stat-total-applicants" />
        <StatCard icon={UserCheck} label="Shortlisted" value={stats?.shortlisted ?? "—"} accent="warning" testid="stat-shortlisted" />
        <StatCard icon={CheckCircle2} label="Hired" value={stats?.hired ?? "—"} accent="success" testid="stat-hired" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 font-heading text-lg font-semibold">Applicant funnel</h3>
          {chartData.some((c) => c.count > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No applicants yet</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold">Latest applicants</h3>
            <Link to="/app/applicants" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : apps?.length ? (
            <div className="divide-y divide-border">
              {apps.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{a.student?.name}</p>
                    <p className="text-xs text-muted-foreground">{a.job?.title}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No applicants yet" subtitle="Post a job to start receiving applications." />
          )}
        </div>
      </div>
    </div>
  );
}
