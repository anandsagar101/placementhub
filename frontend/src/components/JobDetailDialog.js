import React, { useState } from "react";
import {
  MapPin, Briefcase, IndianRupee, Users, Building2, GraduationCap, Loader2, CheckCircle2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ctc } from "@/components/JobCard";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function JobDetailDialog({ job, open, onOpenChange, canApply, applied, onApplied }) {
  const [loading, setLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(applied);

  React.useEffect(() => setIsApplied(applied), [applied, job?.id]);

  if (!job) return null;

  const apply = async () => {
    setLoading(true);
    try {
      await api.post(`/jobs/${job.id}/apply`);
      setIsApplied(true);
      toast.success("Application submitted!");
      onApplied && onApplied();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const rows = [
    { icon: Briefcase, label: "Role type", value: job.role_type },
    { icon: MapPin, label: "Location", value: job.location },
    { icon: IndianRupee, label: "Compensation", value: ctc(job) },
    { icon: Users, label: "Openings", value: job.openings || 1 },
    { icon: GraduationCap, label: "Min CGPA", value: job.eligibility_cgpa || "Any" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" data-testid="job-detail-dialog">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-left font-heading text-xl">{job.title}</DialogTitle>
              <DialogDescription className="text-left">{job.company_name} · {job.company_industry || "—"}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          {rows.map((r) => (
            <div key={r.label} className="rounded-lg border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><r.icon className="h-3.5 w-3.5" /> {r.label}</p>
              <p className="mt-1 text-sm font-semibold">{r.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-2">
          <p className="mb-2 text-sm font-semibold">About the role</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{job.description}</p>
        </div>

        {job.skills?.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Required skills</p>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <span key={s} className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {canApply && (
          isApplied ? (
            <Button disabled className="w-full rounded-full" data-testid="already-applied-btn">
              <CheckCircle2 className="mr-2 h-4 w-4" /> Already applied
            </Button>
          ) : (
            <Button onClick={apply} disabled={loading} className="w-full rounded-full" data-testid="apply-job-btn">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Apply now
            </Button>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
