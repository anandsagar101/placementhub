import React, { useState } from "react";
import useSWR from "swr";
import { Users, Loader2, Mail, GraduationCap, ExternalLink } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, EmptyState, STATUS_META } from "@/components/shared";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);
const STATUS_OPTS = ["applied", "under_review", "shortlisted", "interview", "selected", "rejected"];

export default function Applicants() {
  const { data: apps, isLoading, mutate } = useSWR("/applications/received", fetcher);
  const [jobFilter, setJobFilter] = useState("all");

  const jobs = Array.from(
    new Map((apps || []).map((a) => [a.job?.id, a.job?.title])).entries()
  ).filter(([id]) => id);

  const filtered = (apps || []).filter((a) => jobFilter === "all" || a.job?.id === jobFilter);

  const updateStatus = async (appId, status) => {
    try {
      await api.patch(`/applications/${appId}/status`, { status });
      toast.success(`Marked as ${STATUS_META[status]?.label || status}`);
      mutate();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Applicants" subtitle="Review candidates and move them through your hiring pipeline.">
        {jobs.length > 0 && (
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-56" data-testid="applicant-job-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All jobs</SelectItem>
              {jobs.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead className="hidden md:table-cell">Applied for</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
                <TableHead className="w-48">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id} data-testid={`applicant-row-${a.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(a.student?.name || "?").slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-medium">{a.student?.name}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {a.student?.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{a.job?.title}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      {a.student?.branch && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {a.student.branch} · CGPA {a.student.cgpa ?? "—"}</span>}
                      {a.student?.resume_url && <a href={a.student.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Resume</a>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                      <SelectTrigger data-testid={`status-select-${a.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s]?.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Users} title="No applicants yet" subtitle="Once students apply to your jobs, they'll show up here." testid="applicants-empty" />
      )}
    </div>
  );
}
