import React, { useState } from "react";
import useSWR from "swr";
import { ShieldCheck, Loader2, Plus, Mail, UserCog } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

const ROLE_LABEL = { super_admin: "Super Admin", placement_officer: "Placement Officer", department_coordinator: "Dept Coordinator" };
const ROLE_CLS = {
  super_admin: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  placement_officer: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  department_coordinator: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const PERMS = [
  ["Verify students & documents", ["super_admin", "placement_officer", "department_coordinator"]],
  ["Freeze / unfreeze students", ["super_admin", "placement_officer"]],
  ["Approve recruiters", ["super_admin", "placement_officer"]],
  ["Moderate & delete jobs", ["super_admin", "placement_officer"]],
  ["View audit logs", ["super_admin", "placement_officer"]],
  ["Manage staff & delete users", ["super_admin"]],
];

export default function Staff() {
  const { data: staff, isLoading, mutate } = useSWR("/admin/staff", fetcher);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", admin_role: "placement_officer" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/staff", form);
      toast.success("Staff account created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", admin_role: "placement_officer" });
      mutate();
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Staff & Roles" subtitle="Manage placement cell staff and their role-based permissions.">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full" data-testid="add-staff-btn"><Plus className="mr-2 h-4 w-4" /> Add staff</Button>
          </DialogTrigger>
          <DialogContent data-testid="staff-dialog">
            <DialogHeader><DialogTitle>Create staff account</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div><Label className="mb-2 block text-sm">Name</Label><Input required value={form.name} onChange={set("name")} data-testid="staff-name" /></div>
              <div><Label className="mb-2 block text-sm">Email</Label><Input type="email" required value={form.email} onChange={set("email")} data-testid="staff-email" /></div>
              <div><Label className="mb-2 block text-sm">Password</Label><Input type="password" required value={form.password} onChange={set("password")} data-testid="staff-password" /></div>
              <div>
                <Label className="mb-2 block text-sm">Role</Label>
                <Select value={form.admin_role} onValueChange={(v) => setForm((s) => ({ ...s, admin_role: v }))}>
                  <SelectTrigger data-testid="staff-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placement_officer">Placement Officer</SelectItem>
                    <SelectItem value="department_coordinator">Department Coordinator</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={saving} className="w-full rounded-full" data-testid="create-staff-btn">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {staff?.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4" data-testid={`staff-${s.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserCog className="h-5 w-5" /></div>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {s.email}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", ROLE_CLS[s.admin_role])}>{ROLE_LABEL[s.admin_role] || s.admin_role}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-heading font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Permission matrix</h3>
          <div className="space-y-3">
            {PERMS.map(([label, roles]) => (
              <div key={label}>
                <p className="text-sm font-medium">{label}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {roles.map((r) => (
                    <span key={r} className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold", ROLE_CLS[r])}>{ROLE_LABEL[r]}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
