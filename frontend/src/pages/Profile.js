import React, { useState } from "react";
import { Loader2, Save, User, Building2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

function Field({ label, children }) {
  return (
    <div>
      <Label className="mb-2 block text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const isCompany = user?.role === "company";
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    location: user?.location || "",
    bio: user?.bio || "",
    // student
    branch: user?.branch || "",
    degree: user?.degree || "",
    graduation_year: user?.graduation_year || "",
    cgpa: user?.cgpa || "",
    skills: (user?.skills || []).join(", "),
    resume_url: user?.resume_url || "",
    linkedin: user?.linkedin || "",
    github: user?.github || "",
    // company
    company_name: user?.company_name || "",
    industry: user?.industry || "",
    website: user?.website || "",
    company_size: user?.company_size || "",
    about: user?.about || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    const payload = { name: form.name, phone: form.phone, location: form.location };
    if (isCompany) {
      Object.assign(payload, {
        company_name: form.company_name, industry: form.industry,
        website: form.website, company_size: form.company_size, about: form.about,
      });
    } else {
      Object.assign(payload, {
        branch: form.branch, degree: form.degree, bio: form.bio,
        resume_url: form.resume_url, linkedin: form.linkedin, github: form.github,
        graduation_year: form.graduation_year ? Number(form.graduation_year) : undefined,
        cgpa: form.cgpa ? Number(form.cgpa) : undefined,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
    }
    try {
      await api.put("/profile", payload);
      await refreshUser();
      toast.success("Profile updated");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={isCompany ? "Company Profile" : "My Profile"}
        subtitle={isCompany ? "Recruiters see this when reviewing your postings." : "A complete profile improves your chances with recruiters."}
      />

      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isCompany ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
          </div>
          <div>
            <p className="font-heading text-lg font-semibold">{isCompany ? form.company_name || user?.name : form.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {isCompany ? (
            <>
              <Field label="Company name"><Input data-testid="pf-company-name" value={form.company_name} onChange={set("company_name")} /></Field>
              <Field label="Industry"><Input data-testid="pf-industry" value={form.industry} onChange={set("industry")} placeholder="e.g. FinTech" /></Field>
              <Field label="Website"><Input data-testid="pf-website" value={form.website} onChange={set("website")} placeholder="https://" /></Field>
              <Field label="Company size"><Input data-testid="pf-size" value={form.company_size} onChange={set("company_size")} placeholder="e.g. 50-200" /></Field>
              <Field label="Location"><Input data-testid="pf-location" value={form.location} onChange={set("location")} /></Field>
              <Field label="Phone"><Input data-testid="pf-phone" value={form.phone} onChange={set("phone")} /></Field>
              <div className="sm:col-span-2">
                <Field label="About the company"><Textarea data-testid="pf-about" value={form.about} onChange={set("about")} rows={4} /></Field>
              </div>
            </>
          ) : (
            <>
              <Field label="Full name"><Input data-testid="pf-name" value={form.name} onChange={set("name")} /></Field>
              <Field label="Phone"><Input data-testid="pf-phone" value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Degree"><Input data-testid="pf-degree" value={form.degree} onChange={set("degree")} placeholder="e.g. B.Tech" /></Field>
              <Field label="Branch"><Input data-testid="pf-branch" value={form.branch} onChange={set("branch")} placeholder="e.g. CSE" /></Field>
              <Field label="Graduation year"><Input data-testid="pf-gradyear" type="number" value={form.graduation_year} onChange={set("graduation_year")} placeholder="2026" /></Field>
              <Field label="CGPA"><Input data-testid="pf-cgpa" type="number" step="0.01" value={form.cgpa} onChange={set("cgpa")} placeholder="8.5" /></Field>
              <Field label="Location"><Input data-testid="pf-location" value={form.location} onChange={set("location")} /></Field>
              <Field label="Resume link"><Input data-testid="pf-resume" value={form.resume_url} onChange={set("resume_url")} placeholder="https://drive..." /></Field>
              <Field label="LinkedIn"><Input data-testid="pf-linkedin" value={form.linkedin} onChange={set("linkedin")} placeholder="https://linkedin.com/in/" /></Field>
              <Field label="GitHub"><Input data-testid="pf-github" value={form.github} onChange={set("github")} placeholder="https://github.com/" /></Field>
              <div className="sm:col-span-2">
                <Field label="Skills (comma separated)"><Input data-testid="pf-skills" value={form.skills} onChange={set("skills")} placeholder="Python, React, SQL" /></Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Bio"><Textarea data-testid="pf-bio" value={form.bio} onChange={set("bio")} rows={4} placeholder="Tell recruiters about yourself" /></Field>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <Button onClick={save} disabled={saving} className="rounded-full" data-testid="save-profile-btn">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
