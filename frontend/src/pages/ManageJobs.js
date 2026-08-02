import React, { useState } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, MoreVertical, Trash2, Power, PlusCircle, Users } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import JobCard from "@/components/JobCard";
import JobDetailDialog from "@/components/JobDetailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function ManageJobs() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const url = isAdmin ? "/jobs" : "/jobs?mine=true";
  const { data: jobs, isLoading, mutate } = useSWR(url, fetcher);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const toggleStatus = async (job) => {
    const next = job.status === "active" ? "closed" : "active";
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: next });
      toast.success(`Job ${next === "active" ? "activated" : "closed"}`);
      mutate();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const remove = async () => {
    try {
      await api.delete(`/jobs/${toDelete.id}`);
      toast.success("Job deleted");
      setToDelete(null);
      mutate();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const menu = (job) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
          data-testid={`job-menu-${job.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => toggleStatus(job)} data-testid={`toggle-status-${job.id}`}>
          <Power className="mr-2 h-4 w-4" /> {job.status === "active" ? "Close job" : "Activate job"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setToDelete(job)} className="text-destructive focus:text-destructive" data-testid={`delete-job-${job.id}`}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <PageHeader
        title={isAdmin ? "All Jobs" : "My Jobs"}
        subtitle={isAdmin ? "Moderate every posting across the platform." : "Manage your active and closed job postings."}
      >
        {!isAdmin && (
          <Link to="/app/post-job"><Button className="rounded-full" data-testid="post-job-header-btn"><PlusCircle className="mr-2 h-4 w-4" /> Post a job</Button></Link>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : jobs?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showStatus
              onClick={() => { setSelected(job); setOpen(true); }}
              testid={`manage-job-${job.id}`}
              footer={
                <div className="flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {job.applicants_count} applied</span>
                  ) : (
                    <Link
                      to="/app/applicants"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <Users className="h-4 w-4" /> View applicants
                    </Link>
                  )}
                  {menu(job)}
                </div>
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Briefcase}
          title={isAdmin ? "No jobs posted yet" : "You haven't posted any jobs"}
          subtitle={isAdmin ? "Jobs posted by recruiters will appear here." : "Create your first posting to start hiring."}
          action={!isAdmin && <Link to="/app/post-job"><Button className="rounded-full">Post a job</Button></Link>}
          testid="manage-jobs-empty"
        />
      )}

      <JobDetailDialog job={selected} open={open} onOpenChange={setOpen} canApply={false} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{toDelete?.title}" and all its applications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="confirm-delete-job">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
