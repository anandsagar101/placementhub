import React, { useState } from "react";
import useSWR from "swr";
import { GraduationCap, Building2, Loader2, Trash2, Mail } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

export default function ManageUsers({ role }) {
  const isStudent = role === "student";
  const { data: users, isLoading, mutate } = useSWR(`/admin/users?role=${role}`, fetcher);
  const [busy, setBusy] = useState(null);

  const remove = async (id) => {
    setBusy(id);
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("User removed");
      mutate();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  const Icon = isStudent ? GraduationCap : Building2;

  return (
    <div>
      <PageHeader
        title={isStudent ? "Students" : "Companies"}
        subtitle={isStudent ? "All registered students and their application activity." : "All hiring partners on the platform."}
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : users?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isStudent ? "Student" : "Company"}</TableHead>
                <TableHead className="hidden md:table-cell">{isStudent ? "Branch / CGPA" : "Industry"}</TableHead>
                <TableHead className="hidden sm:table-cell">{isStudent ? "Applications" : "Jobs"}</TableHead>
                <TableHead className="w-16 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{isStudent ? u.name : (u.company_name || u.name)}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {isStudent ? `${u.branch || "—"} · CGPA ${u.cgpa ?? "—"}` : (u.industry || "—")}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {isStudent ? (u.applications_count ?? 0) : (u.jobs_count ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-muted-foreground hover:text-destructive" data-testid={`delete-user-${u.id}`} disabled={busy === u.id}>
                          {busy === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this {isStudent ? "student" : "company"}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes {u.name} and all associated data. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid={`confirm-delete-user-${u.id}`}>Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Icon} title={`No ${isStudent ? "students" : "companies"} yet`} testid="users-empty" />
      )}
    </div>
  );
}
