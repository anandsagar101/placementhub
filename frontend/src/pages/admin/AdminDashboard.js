import React from "react";
import useSWR from "swr";
import {
  GraduationCap, Building2, Briefcase, FileText, TrendingUp, Loader2, Trophy,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import api from "@/lib/api";
import { StatCard, PageHeader } from "@/components/shared";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function AdminDashboard() {
  const { data: stats, isLoading } = useSWR("/admin/stats", fetcher);

  if (isLoading || !stats) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <PageHeader title="Placement Analytics" subtitle="Real-time overview of the entire placement season." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={GraduationCap} label="Students" value={stats.total_students} accent="primary" testid="stat-students" />
        <StatCard icon={Building2} label="Companies" value={stats.total_companies} accent="violet" testid="stat-companies" />
        <StatCard icon={Briefcase} label="Jobs" value={stats.total_jobs} accent="warning" testid="stat-jobs" />
        <StatCard icon={FileText} label="Applications" value={stats.total_applications} accent="primary" testid="stat-apps" />
        <StatCard icon={Trophy} label="Placed" value={stats.placed} accent="success" testid="stat-placed" />
        <StatCard icon={TrendingUp} label="Placement Rate" value={`${stats.placement_rate}%`} accent="success" testid="stat-rate" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
          <h3 className="mb-4 font-heading text-lg font-semibold">Applications & placements trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.trend}>
              <defs>
                <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPlaced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip />
              <Area type="monotone" dataKey="applications" stroke="hsl(var(--primary))" fill="url(#gApps)" strokeWidth={2} />
              <Area type="monotone" dataKey="placed" stroke="#10b981" fill="url(#gPlaced)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 font-heading text-lg font-semibold">Top companies by applications</h3>
          {stats.top_companies?.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.top_companies} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="applications" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">No data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
