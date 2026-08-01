import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Search, Briefcase, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/shared";
import JobCard from "@/components/JobCard";
import JobDetailDialog from "@/components/JobDetailDialog";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function BrowseJobs() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleType, setRoleType] = useState("all");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = new URLSearchParams();
  if (debounced) params.set("search", debounced);
  if (roleType !== "all") params.set("role_type", roleType);
  const { data: jobs, isLoading, mutate } = useSWR(`/jobs?${params.toString()}`, fetcher);

  const openJob = (job) => { setSelected(job); setOpen(true); };

  return (
    <div>
      <PageHeader title="Browse Jobs" subtitle="Discover verified drives and internships. Apply in one click." />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="job-search-input"
            placeholder="Search by title, location or keyword"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleType} onValueChange={setRoleType}>
          <SelectTrigger className="w-full sm:w-48" data-testid="job-type-filter">
            <SelectValue placeholder="Role type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="Full-time">Full-time</SelectItem>
            <SelectItem value="Internship">Internship</SelectItem>
            <SelectItem value="Part-time">Part-time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, i) => (
            <div key={job.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <JobCard job={job} onClick={() => openJob(job)} testid={`job-card-${job.id}`} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Briefcase} title="No jobs found" subtitle="Try adjusting your search or filters." testid="jobs-empty" />
      )}

      <JobDetailDialog
        job={selected}
        open={open}
        onOpenChange={setOpen}
        canApply
        applied={selected?.already_applied}
        onApplied={() => mutate()}
      />
    </div>
  );
}
