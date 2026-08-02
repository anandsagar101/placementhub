import React from "react";
import { MapPin, Briefcase, IndianRupee, Users, Building2, Clock } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { cn } from "@/lib/utils";

function ctc(job) {
  if (job.ctc_min && job.ctc_max) return `${job.ctc_min}–${job.ctc_max} LPA`;
  if (job.ctc_min) return `${job.ctc_min}+ LPA`;
  return "Not disclosed";
}

export default function JobCard({ job, onClick, footer, showStatus = false, testid }) {
  return (
    <div
      data-testid={testid}
      onClick={onClick}
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-card p-6 transition-transform duration-200",
        onClick && "cursor-pointer hover:-translate-y-1 hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold leading-tight group-hover:text-primary">{job.title}</h3>
            <p className="text-sm text-muted-foreground">{job.company_name || "Company"}</p>
          </div>
        </div>
        {job.featured && !showStatus && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">Featured</span>
        )}
        {showStatus && <StatusBadge status={job.status} />}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {job.role_type}</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
        <span className="inline-flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> {ctc(job)}</span>
      </div>

      {job.skills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {job.skills.slice(0, 4).map((s) => (
            <span key={s} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium">{s}</span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {job.applicants_count ?? 0} applicants</span>
        {job.already_applied && (
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400"><Clock className="h-4 w-4" /> Applied</span>
        )}
      </div>

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}

export { ctc };
