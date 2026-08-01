import React, { useState } from "react";
import useSWR from "swr";
import {
  Rocket, Loader2, MapPin, IndianRupee, Users, Calendar, Building2, Plus, CheckCircle2,
  Layers, CalendarPlus, MoreVertical,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import InterviewScheduleDialog from "@/components/InterviewScheduleDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);
const DRIVE_TYPES = ["Internship", "Full-Time", "PPO", "Hackathon", "Walk-In"];
const STAGES = ["registered", "eligible", "shortlisted", "round_1", "round_2", "hr", "offer", "accepted", "placed"];
const STATUS_CLS = {
  registration_open: "bg-emerald-500/10 text-emerald-600", upcoming: "bg-blue-500/10 text-blue-600",
  registration_closed: "bg-amber-500/10 text-amber-600", ongoing: "bg-violet-500/10 text-violet-600",
  completed: "bg-slate-500/10 text-slate-600", cancelled: "bg-rose-500/10 text-rose-600",
};
const MOD_CLS = { approved: "bg-emerald-500/10 text-emerald-600", pending: "bg-amber-500/10 text-amber-600", rejected: "bg-rose-500/10 text-rose-600", archived: "bg-slate-500/10 text-slate-600" };

function pkg(d) { return d.package_min && d.package_max ? `${d.package_min}–${d.package_max} LPA` : (d.package_min ? `${d.package_min}+ LPA` : "—"); }

function CreateDriveDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", role: "", package_min: "", package_max: "", location: "", description: "", drive_type: "Full-Time", eligibility_cgpa: "", max_backlogs: "", branches: "", passing_year: "", registration_deadline: "", drive_date: "", max_applicants: "", rounds: "Aptitude, Technical, HR" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/drives", {
        title: f.title, role: f.role, location: f.location || "Remote", description: f.description,
        drive_type: f.drive_type,
        package_min: f.package_min ? Number(f.package_min) : null, package_max: f.package_max ? Number(f.package_max) : null,
        eligibility_cgpa: f.eligibility_cgpa ? Number(f.eligibility_cgpa) : null,
        max_backlogs: f.max_backlogs !== "" ? Number(f.max_backlogs) : null,
        branches: f.branches ? f.branches.split(",").map((s) => s.trim()).filter(Boolean) : [],
        passing_year: f.passing_year ? Number(f.passing_year) : null,
        registration_deadline: f.registration_deadline || null, drive_date: f.drive_date || null,
        max_applicants: f.max_applicants ? Number(f.max_applicants) : null,
        rounds: f.rounds ? f.rounds.split(",").map((s) => s.trim()).filter(Boolean) : [],
        status: "registration_open",
      });
      toast.success("Drive created — pending admin approval");
      setOpen(false); onCreated();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="create-drive-btn"><Plus className="mr-2 h-4 w-4" /> Create drive</Button></DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg" data-testid="create-drive-dialog">
        <DialogHeader><DialogTitle>Create Campus Drive</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">Drive title</Label><Input required value={f.title} onChange={set("title")} data-testid="drive-title" /></div>
          <div><Label className="mb-2 block text-sm">Job role</Label><Input required value={f.role} onChange={set("role")} data-testid="drive-role" /></div>
          <div>
            <Label className="mb-2 block text-sm">Type</Label>
            <Select value={f.drive_type} onValueChange={(v) => setF((s) => ({ ...s, drive_type: v }))}>
              <SelectTrigger data-testid="drive-type"><SelectValue /></SelectTrigger>
              <SelectContent>{DRIVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-2 block text-sm">Min package (LPA)</Label><Input type="number" step="0.1" value={f.package_min} onChange={set("package_min")} data-testid="drive-pkgmin" /></div>
          <div><Label className="mb-2 block text-sm">Max package (LPA)</Label><Input type="number" step="0.1" value={f.package_max} onChange={set("package_max")} data-testid="drive-pkgmax" /></div>
          <div><Label className="mb-2 block text-sm">Location</Label><Input value={f.location} onChange={set("location")} data-testid="drive-location" /></div>
          <div><Label className="mb-2 block text-sm">Max applicants</Label><Input type="number" value={f.max_applicants} onChange={set("max_applicants")} data-testid="drive-maxapp" /></div>
          <div><Label className="mb-2 block text-sm">Min CGPA</Label><Input type="number" step="0.1" value={f.eligibility_cgpa} onChange={set("eligibility_cgpa")} data-testid="drive-cgpa" /></div>
          <div><Label className="mb-2 block text-sm">Max backlogs</Label><Input type="number" value={f.max_backlogs} onChange={set("max_backlogs")} data-testid="drive-backlogs" /></div>
          <div><Label className="mb-2 block text-sm">Branches (comma)</Label><Input value={f.branches} onChange={set("branches")} placeholder="CSE, IT" data-testid="drive-branches" /></div>
          <div><Label className="mb-2 block text-sm">Passing year</Label><Input type="number" value={f.passing_year} onChange={set("passing_year")} data-testid="drive-passyear" /></div>
          <div><Label className="mb-2 block text-sm">Registration deadline</Label><Input type="date" value={f.registration_deadline} onChange={set("registration_deadline")} data-testid="drive-deadline" /></div>
          <div><Label className="mb-2 block text-sm">Drive date</Label><Input type="date" value={f.drive_date} onChange={set("drive_date")} data-testid="drive-date" /></div>
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">Rounds (comma)</Label><Input value={f.rounds} onChange={set("rounds")} data-testid="drive-rounds" /></div>
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">Description</Label><Textarea rows={3} value={f.description} onChange={set("description")} data-testid="drive-description" /></div>
          <Button type="submit" disabled={saving} className="sm:col-span-2 rounded-full" data-testid="drive-submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create drive</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PipelineDialog({ drive, open, onOpenChange }) {
  const { data: regs, mutate } = useSWR(open && drive ? `/drives/${drive.id}/registrations` : null, fetcher);
  const [schedule, setSchedule] = useState(null);
  const advance = async (regId, stage) => {
    try { await api.patch(`/registrations/${regId}/stage`, { status: stage }); toast.success("Stage updated"); mutate(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="pipeline-dialog">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="h-4 w-4" /> {drive?.title} — Pipeline</DialogTitle></DialogHeader>
        {!regs ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : regs.length ? (
          <div className="space-y-2">
            {regs.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3" data-testid={`pipeline-row-${r.id}`}>
                <div>
                  <p className="text-sm font-medium">{r.student?.name}</p>
                  <p className="text-xs text-muted-foreground">{r.student?.branch} · CGPA {r.student?.cgpa ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={r.stage} onValueChange={(v) => advance(r.id, v)}>
                    <SelectTrigger className="w-36" data-testid={`stage-select-${r.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{STAGES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => setSchedule(r)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary" title="Schedule interview" data-testid={`schedule-btn-${r.id}`}><CalendarPlus className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Users} title="No registrations yet" />}
        {schedule && (
          <InterviewScheduleDialog open={!!schedule} onOpenChange={(o) => !o && setSchedule(null)}
            studentId={schedule.student_id} driveId={drive.id} studentName={schedule.student?.name} onScheduled={() => setSchedule(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Drives() {
  const { user } = useAuth();
  const role = user?.role;
  const url = role === "company" ? "/drives?mine=true" : "/drives";
  const { data: drives, isLoading, mutate } = useSWR(url, fetcher);
  const { data: myRegs } = useSWR(role === "student" ? "/drives/me/registered" : null, fetcher);
  const [pipeline, setPipeline] = useState(null);

  const stageByDrive = {};
  (myRegs || []).forEach((r) => { stageByDrive[r.drive_id] = r.stage; });

  const register = async (id) => { try { await api.post(`/drives/${id}/register`); toast.success("Registered"); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const withdraw = async (id) => { try { await api.delete(`/drives/${id}/register`); toast.success("Withdrawn"); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const moderate = async (id, status) => { try { await api.patch(`/drives/${id}/moderation`, { status }); toast.success(`Drive ${status}`); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const setStatus = async (id, status) => { try { await api.patch(`/drives/${id}/status`, { status }); toast.success("Status updated"); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Campus Drives" subtitle={role === "student" ? "Register for drives and track your progress." : role === "company" ? "Create and manage your campus drives." : "Moderate all campus drives."}>
        {role === "company" && <CreateDriveDialog onCreated={mutate} />}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : drives?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drives.map((d) => {
            const stage = stageByDrive[d.id];
            return (
              <div key={d.id} className="flex flex-col rounded-xl border border-border bg-card p-6" data-testid={`drive-card-${d.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-heading text-base font-semibold leading-tight">{d.title}</h3>
                      <p className="text-sm text-muted-foreground">{d.company_name} · {d.role}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{d.drive_type}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {d.location}</span>
                  <span className="inline-flex items-center gap-1.5"><IndianRupee className="h-4 w-4" /> {pkg(d)}</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {d.registrations_count} regd</span>
                  {d.drive_date && <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {d.drive_date}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", STATUS_CLS[d.status])}>{(d.status || "").replace("_", " ")}</span>
                  {(role === "admin" || role === "company") && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold capitalize", MOD_CLS[d.moderation])}>{d.moderation}</span>}
                  {stage && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-600 capitalize">You: {stage.replace("_", " ")}</span>}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {role === "student" && (d.registered
                    ? <Button size="sm" variant="outline" className="rounded-full" onClick={() => withdraw(d.id)} data-testid={`withdraw-${d.id}`}>Withdraw</Button>
                    : <Button size="sm" className="rounded-full" onClick={() => register(d.id)} data-testid={`register-${d.id}`}>Register</Button>)}
                  {role === "company" && (
                    <>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPipeline(d)} data-testid={`pipeline-${d.id}`}><Layers className="mr-1 h-4 w-4" /> Pipeline</Button>
                      <Select value={d.status} onValueChange={(v) => setStatus(d.id, v)}>
                        <SelectTrigger className="h-9 w-40 rounded-full text-xs" data-testid={`drive-status-${d.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(STATUS_CLS).map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </>
                  )}
                  {role === "admin" && d.moderation !== "approved" && <Button size="sm" className="rounded-full" onClick={() => moderate(d.id, "approved")} data-testid={`approve-drive-${d.id}`}><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>}
                  {role === "admin" && d.moderation === "pending" && <Button size="sm" variant="outline" className="rounded-full text-rose-600" onClick={() => moderate(d.id, "rejected")} data-testid={`reject-drive-${d.id}`}>Reject</Button>}
                  {role === "admin" && d.moderation === "approved" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => moderate(d.id, "archived")} data-testid={`archive-drive-${d.id}`}>Archive</Button>}
                  {role === "company" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setPipeline(d)}>Manage</Button>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Rocket} title="No campus drives yet" subtitle={role === "company" ? "Create your first drive to start hiring on campus." : "Check back soon for upcoming drives."} testid="drives-empty" />
      )}

      <PipelineDialog drive={pipeline} open={!!pipeline} onOpenChange={(o) => !o && setPipeline(null)} />
    </div>
  );
}
