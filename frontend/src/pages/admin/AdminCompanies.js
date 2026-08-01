import React from "react";
import useSWR from "swr";
import { useSearchParams } from "react-router-dom";
import { Building2, Loader2, Mail, CheckCircle2, XCircle, Globe, Trash2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

function ApprovalBadge({ status }) {
  const map = {
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  };
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold capitalize", map[status] || map.pending)}>{status}</span>;
}

export default function AdminCompanies() {
  const { user } = useAuth();
  const canApprove = ["super_admin", "placement_officer"].includes(user?.admin_role);
  const canDelete = user?.admin_role === "super_admin";
  const [sp] = useSearchParams();
  const [approval, setApproval] = React.useState(sp.get("approval") || "all");
  const qs = approval !== "all" ? `?approval=${approval}` : "";
  const { data: companies, isLoading, mutate } = useSWR(`/admin/companies${qs}`, fetcher);

  const decide = async (id, status) => {
    try {
      await api.patch(`/admin/companies/${id}/approval`, { status });
      toast.success(`Recruiter ${status}`);
      mutate();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this company and its jobs?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Deleted"); mutate(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Companies" subtitle="Approve recruiters and manage hiring partners.">
        <Select value={approval} onValueChange={setApproval}>
          <SelectTrigger className="w-48" data-testid="company-approval-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : companies?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="hidden md:table-cell">Industry</TableHead>
                <TableHead className="hidden sm:table-cell">Jobs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-56 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id} data-testid={`company-row-${c.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Building2 className="h-4 w-4" /></div>
                      <div>
                        <p className="font-medium">{c.company_name || c.name}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {c.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{c.industry || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{c.jobs_count ?? 0}</TableCell>
                  <TableCell><ApprovalBadge status={c.approval_status || "approved"} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canApprove && c.approval_status !== "approved" && (
                        <Button size="sm" className="rounded-full" onClick={() => decide(c.id, "approved")} data-testid={`approve-company-${c.id}`}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
                      )}
                      {canApprove && c.approval_status === "pending" && (
                        <Button size="sm" variant="outline" className="rounded-full text-rose-600" onClick={() => decide(c.id, "rejected")} data-testid={`reject-company-${c.id}`}><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                      )}
                      {canApprove && c.approval_status === "approved" && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => decide(c.id, "pending")} data-testid={`revoke-company-${c.id}`}>Revoke</Button>
                      )}
                      {canDelete && <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive" data-testid={`delete-company-${c.id}`}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={Building2} title="No companies found" testid="companies-empty" />
      )}
    </div>
  );
}
