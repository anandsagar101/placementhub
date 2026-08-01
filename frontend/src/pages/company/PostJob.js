import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, PlusCircle } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function Field({ label, children, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-2 block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export default function PostJob() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    title: "", description: "", role_type: "Full-time", location: "",
    ctc_min: "", ctc_max: "", skills: "", eligibility_cgpa: "", openings: "1", experience: "Fresher",
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/jobs", {
        title: f.title,
        description: f.description,
        role_type: f.role_type,
        location: f.location || "Remote",
        ctc_min: f.ctc_min ? Number(f.ctc_min) : null,
        ctc_max: f.ctc_max ? Number(f.ctc_max) : null,
        skills: f.skills ? f.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        eligibility_cgpa: f.eligibility_cgpa ? Number(f.eligibility_cgpa) : null,
        openings: f.openings ? Number(f.openings) : 1,
        experience: f.experience,
      });
      toast.success("Job posted successfully");
      navigate("/app/jobs");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Post a Job" subtitle="Create a new drive to reach qualified candidates." />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Job title" full><Input data-testid="job-title-input" required value={f.title} onChange={set("title")} placeholder="e.g. Software Engineer" /></Field>
          <Field label="Role type">
            <Select value={f.role_type} onValueChange={(v) => setF((s) => ({ ...s, role_type: v }))}>
              <SelectTrigger data-testid="job-roletype-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Location"><Input data-testid="job-location-input" value={f.location} onChange={set("location")} placeholder="e.g. Bengaluru / Remote" /></Field>
          <Field label="Min CTC (LPA)"><Input data-testid="job-ctcmin-input" type="number" step="0.1" value={f.ctc_min} onChange={set("ctc_min")} placeholder="8" /></Field>
          <Field label="Max CTC (LPA)"><Input data-testid="job-ctcmax-input" type="number" step="0.1" value={f.ctc_max} onChange={set("ctc_max")} placeholder="14" /></Field>
          <Field label="Openings"><Input data-testid="job-openings-input" type="number" value={f.openings} onChange={set("openings")} /></Field>
          <Field label="Min CGPA"><Input data-testid="job-cgpa-input" type="number" step="0.1" value={f.eligibility_cgpa} onChange={set("eligibility_cgpa")} placeholder="7.0" /></Field>
          <Field label="Required skills (comma separated)" full><Input data-testid="job-skills-input" value={f.skills} onChange={set("skills")} placeholder="Java, Spring, AWS" /></Field>
          <Field label="Job description" full><Textarea data-testid="job-description-input" required rows={6} value={f.description} onChange={set("description")} placeholder="Describe the role, responsibilities and what makes it exciting..." /></Field>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={saving} className="rounded-full" data-testid="submit-job-btn">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Publish job
          </Button>
        </div>
      </form>
    </div>
  );
}
