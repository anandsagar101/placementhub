import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { FileText, Loader2, Building2, MapPin } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState, StatusBadge, STATUS_META } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);

function Timeline({ timeline = [] }) {
  return (
    <ol className="relative ml-2 mt-4 border-l border-border pl-6">
      {timeline.map((t, i) => (
        <li key={i} className="mb-4 last:mb-0">
          <span className={cn("absolute -left-[7px] mt-1 h-3.5 w-3.5 rounded-full border-2 border-background",
            i === timeline.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status} />
            <span className="text-xs text-muted-foreground">{new Date(t.at).toLocaleDateString()}</span>
          </div>
          {t.note && <p className="mt-1 text-sm text-muted-foreground">{t.note}</p>}
        </li>
      ))}
    </ol>
  );
}

export default function MyApplications() {
  const { data: apps, isLoading } = useSWR("/applications/me", fetcher);

  return (
    <div>
      <PageHeader title="My Applications" subtitle="Track the status of every job you've applied to." />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : apps?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {apps.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-6" data-testid={`application-${a.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold">{a.job?.title}</h3>
                    <p className="text-sm text-muted-foreground">{a.job?.company_name}</p>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              {a.job?.location && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {a.job.location}
                </p>
              )}
              <Timeline timeline={a.timeline} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No applications yet"
          subtitle="Browse open jobs and apply to start tracking your progress."
          action={<Link to="/app/jobs"><Button className="rounded-full">Browse jobs</Button></Link>}
          testid="applications-empty"
        />
      )}
    </div>
  );
}
