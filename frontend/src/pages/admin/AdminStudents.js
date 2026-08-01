import React, { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "react-router-dom";
import {
  GraduationCap, Loader2, Mail, Search, Filter, Eye, CheckCircle2, XCircle,
  Snowflake, ShieldCheck, FileText, Trash2,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState, StatusBadge } from "@/components/shared";
import DocumentPreview from "@/components/DocumentPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

const DOC_LABELS = {
  profile_photo: "Profile Photo", resume: "Resume", marksheet_10: "10th Marksheet",
  marksheet_12: "12th Marksheet", semester_marksheet: "Semester Marksheet",
  aadhar: "Aadhar", pan: "PAN", certificate: "Certificate", offer_letter: "Offer Letter",
  portfolio: "Portfolio", other: "Other",
};
const DOC_STATUS_CLS = {
  verified: "text-emerald-600", rejected: "text-rose-600", reupload: "text-amber-600", pending: "text-blue-600",
};

function VerifBadge({ status }) {
  const map = {
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    rejected: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    changes_requested: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };
  const label = { approved: "Verified", pending: "Pending", rejected: "Rejected", changes_requested: "Changes" };
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold", map[status] || map.pending)}>{label[status] || status}</span>;
}

function StudentDialog({ student, open, onOpenChange, onChanged, canFreeze }) {
  const [remarks, setRemarks] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!student) return null;
  const docs = student.documents || {};

  const decide = async (status) => {
    setBusy(true);
    try {
      await api.patch(`/admin/students/${student.id}/verification`, { status, remarks });
      toast.success(`Student ${status.replace("_", " ")}`);
      onChanged();
      onOpenChange(false);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const reviewDoc = async (docType, status) => {
    try {
      await api.patch(`/admin/documents/${student.id}/${docType}`, { status, remarks: null });
      toast.success(`Document ${status}`);
      onChanged();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const freeze = async (frozen) => {
    const reason = frozen ? (window.prompt("Freeze reason (e.g. Disciplinary Action)") || "Manual") : null;
    if (frozen && !reason) return;
    try {
      await api.patch(`/admin/students/${student.id}/freeze`, { frozen, reason });
      toast.success(frozen ? "Student frozen" : "Student unfrozen");
      onChanged();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto" data-testid="student-manage-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></div>
            <div className="text-left">
              <p className="font-heading">{student.name}</p>
              <p className="text-xs font-normal text-muted-foreground">{student.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[["Branch", student.branch], ["Department", student.department], ["CGPA", student.cgpa],
            ["Backlogs", student.backlogs ?? 0], ["Passing Year", student.graduation_year],
            ["Completion", `${student.profile_completion?.percentage ?? 0}%`]].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-0.5 font-medium">{v ?? "—"}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VerifBadge status={student.verification_status} />
          {student.frozen && <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600"><Snowflake className="h-3 w-3" /> Frozen: {student.freeze_reason}</span>}
          {student.placed && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">Placed</span>}
        </div>

        {/* Documents */}
        <div>
          <p className="mb-2 text-sm font-semibold">Documents</p>
          <div className="space-y-2">
            {Object.keys(docs).length ? Object.entries(docs).map(([type, d]) => (
              <div key={type} className="flex items-center justify-between rounded-lg border border-border p-3" data-testid={`admin-doc-${type}`}>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{DOC_LABELS[type] || type}</span>
                  <span className={cn("text-xs font-semibold", DOC_STATUS_CLS[d.status])}>· {d.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPreview({ title: DOC_LABELS[type], doc: d })} className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground" data-testid={`admin-preview-${type}`}><Eye className="h-3.5 w-3.5" /></button>
                  <button onClick={() => reviewDoc(type, "verified")} className="flex h-7 w-7 items-center justify-center rounded border border-border text-emerald-600" data-testid={`admin-verify-doc-${type}`}><CheckCircle2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => reviewDoc(type, "rejected")} className="flex h-7 w-7 items-center justify-center rounded border border-border text-rose-600" data-testid={`admin-reject-doc-${type}`}><XCircle className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
          </div>
        </div>

        {/* Verification actions */}
        <div>
          <p className="mb-2 text-sm font-semibold">Verification decision</p>
          <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)" rows={2} data-testid="verif-remarks" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => decide("approved")} disabled={busy} className="rounded-full" data-testid="approve-student-btn"><ShieldCheck className="mr-1 h-4 w-4" /> Approve</Button>
            <Button size="sm" variant="outline" onClick={() => decide("changes_requested")} disabled={busy} className="rounded-full" data-testid="changes-student-btn">Request Changes</Button>
            <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={busy} className="rounded-full text-rose-600" data-testid="reject-student-btn"><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
            {canFreeze && (student.frozen
              ? <Button size="sm" variant="outline" onClick={() => freeze(false)} className="rounded-full" data-testid="unfreeze-btn">Unfreeze</Button>
              : <Button size="sm" variant="outline" onClick={() => freeze(true)} className="rounded-full text-rose-600" data-testid="freeze-btn"><Snowflake className="mr-1 h-4 w-4" /> Freeze</Button>)}
          </div>
        </div>

        <DocumentPreview doc={preview?.doc} title={preview?.title} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStudents() {
  const { user } = useAuth();
  const canFreeze = ["super_admin", "placement_officer"].includes(user?.admin_role);
  const canDelete = user?.admin_role === "super_admin";
  const [sp] = useSearchParams();
  const [filters, setFilters] = useState({
    verification: sp.get("verification") || "all", frozen: "all", placed: "all",
    applied: "all", search: "", cgpa_min: "", missing_documents: "all",
  });
  const [selected, setSelected] = useState(null);

  const qs = new URLSearchParams();
  if (filters.verification !== "all") qs.set("verification", filters.verification);
  if (filters.frozen !== "all") qs.set("frozen", filters.frozen);
  if (filters.placed !== "all") qs.set("placed", filters.placed);
  if (filters.applied !== "all") qs.set("applied", filters.applied);
  if (filters.missing_documents === "true") qs.set("missing_documents", "true");
  if (filters.cgpa_min) qs.set("cgpa_min", filters.cgpa_min);
  if (filters.search) qs.set("search", filters.search);

  const { data: students, isLoading, mutate } = useSWR(`/admin/students?${qs.toString()}`, fetcher);
  const setF = (k, v) => setFilters((s) => ({ ...s, [k]: v }));

  const openStudent = async (id) => {
    const { data } = await api.get(`/admin/students/${id}`);
    setSelected(data);
  };
  const refresh = async () => { await mutate(); if (selected) openStudent(selected.id); };

  const del = async (id) => {
    if (!window.confirm("Delete this student permanently?")) return;
    try { await api.delete(`/admin/users/${id}`); toast.success("Deleted"); mutate(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Students" subtitle="Review, verify, freeze and manage students with advanced filters." />

      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-primary" /> Filters</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Name or email" value={filters.search} onChange={(e) => setF("search", e.target.value)} className="pl-9" data-testid="student-search" />
          </div>
          {[
            ["verification", "Verification", [["all", "All"], ["approved", "Verified"], ["pending", "Pending"], ["rejected", "Rejected"], ["changes_requested", "Changes"]]],
            ["frozen", "Freeze", [["all", "All"], ["true", "Frozen"], ["false", "Active"]]],
            ["placed", "Placement", [["all", "All"], ["true", "Placed"], ["false", "Not Placed"]]],
            ["applied", "Applied", [["all", "All"], ["true", "Applied"], ["false", "Not Applied"]]],
            ["missing_documents", "Documents", [["all", "All"], ["true", "Missing Docs"]]],
          ].map(([key, label, opts]) => (
            <Select key={key} value={filters[key]} onValueChange={(v) => setF(key, v)}>
              <SelectTrigger data-testid={`filter-${key}`}><SelectValue placeholder={label} /></SelectTrigger>
              <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{label}: {l}</SelectItem>)}</SelectContent>
            </Select>
          ))}
          <Input type="number" step="0.1" placeholder="Min CGPA" value={filters.cgpa_min} onChange={(e) => setF("cgpa_min", e.target.value)} data-testid="filter-cgpa" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : students?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="hidden md:table-cell">Branch / CGPA</TableHead>
                <TableHead className="hidden lg:table-cell">Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => openStudent(s.id)} data-testid={`student-row-${s.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><GraduationCap className="h-4 w-4" /></div>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {s.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.branch || "—"} · {s.cgpa ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{s.profile_completion?.percentage ?? 0}%</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <VerifBadge status={s.verification_status} />
                      {s.frozen && <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600">Frozen</span>}
                      {s.placed && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">Placed</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openStudent(s.id)} className="text-primary hover:underline text-sm font-medium" data-testid={`manage-student-${s.id}`}>Manage</button>
                      {canDelete && <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-destructive" data-testid={`delete-student-${s.id}`}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={GraduationCap} title="No students match these filters" testid="students-empty" />
      )}

      <StudentDialog student={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onChanged={refresh} canFreeze={canFreeze} />
    </div>
  );
}
