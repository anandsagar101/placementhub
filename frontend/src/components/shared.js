import React from "react";
import { cn } from "@/lib/utils";

export const STATUS_META = {
  applied: { label: "Applied", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  under_review: { label: "Under Review", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  shortlisted: { label: "Shortlisted", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
  interview: { label: "Interview", cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  selected: { label: "Selected", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  rejected: { label: "Rejected", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  active: { label: "Active", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  closed: { label: "Closed", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
};

export function StatusBadge({ status, testid }) {
  const meta = STATUS_META[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span
      data-testid={testid}
      className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", meta.cls)}
    >
      {meta.label}
    </span>
  );
}

export function StatCard({ icon: Icon, label, value, hint, accent = "primary", testid }) {
  const accents = {
    primary: "text-primary bg-primary/10",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    violet: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
  };
  return (
    <div
      data-testid={testid}
      className="rounded-xl border border-border bg-card p-6 transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
          <p className="mt-3 font-heading text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, action, testid }) {
  return (
    <div
      data-testid={testid}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="font-heading text-lg font-semibold">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
