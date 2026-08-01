import React, { useRef, useState } from "react";
import useSWR from "swr";
import {
  FileText, Upload, Loader2, CheckCircle2, XCircle, Clock, Trash2, Eye, AlertCircle,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared";
import DocumentPreview from "@/components/DocumentPreview";
import { uploadToCloudinary } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);

const DOCS = [
  { key: "profile_photo", label: "Profile Photo", mandatory: false },
  { key: "resume", label: "Resume", mandatory: true },
  { key: "marksheet_10", label: "10th Marksheet", mandatory: true },
  { key: "marksheet_12", label: "12th Marksheet", mandatory: true },
  { key: "semester_marksheet", label: "Semester Marksheet", mandatory: false },
  { key: "aadhar", label: "Aadhar", mandatory: false },
  { key: "pan", label: "PAN", mandatory: false },
  { key: "certificate", label: "Certificates", mandatory: false },
  { key: "offer_letter", label: "Offer Letter", mandatory: false },
  { key: "portfolio", label: "Portfolio", mandatory: false },
  { key: "other", label: "Other Documents", mandatory: false },
];

const STATUS_UI = {
  verified: { icon: CheckCircle2, cls: "text-emerald-500", label: "Verified" },
  rejected: { icon: XCircle, cls: "text-rose-500", label: "Rejected" },
  reupload: { icon: AlertCircle, cls: "text-amber-500", label: "Re-upload requested" },
  pending: { icon: Clock, cls: "text-blue-500", label: "Pending review" },
};

function DocRow({ def, doc, onUpload, onDelete, onPreview, uploading }) {
  const inputRef = useRef();
  const st = doc ? (STATUS_UI[doc.status] || STATUS_UI.pending) : null;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4" data-testid={`doc-row-${def.key}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="flex items-center gap-2 font-medium">
            {def.label}
            {def.mandatory && <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">Required</span>}
          </p>
          {doc && st && (
            <p className={cn("mt-0.5 inline-flex items-center gap-1 text-xs", st.cls)}>
              <st.icon className="h-3.5 w-3.5" /> {st.label}
              {doc.remarks && <span className="text-muted-foreground">· {doc.remarks}</span>}
            </p>
          )}
          {!doc && <p className="mt-0.5 text-xs text-muted-foreground">Not uploaded</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {doc && (
          <>
            <button onClick={() => onPreview(def, doc)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground" data-testid={`preview-doc-${def.key}`}>
              <Eye className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(def.key)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive" data-testid={`delete-doc-${def.key}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={(e) => e.target.files[0] && onUpload(def.key, e.target.files[0])} data-testid={`file-input-${def.key}`} />
        <Button size="sm" variant={doc ? "outline" : "default"} className="rounded-full" disabled={uploading === def.key}
          onClick={() => inputRef.current?.click()} data-testid={`upload-doc-${def.key}`}>
          {uploading === def.key ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
          {doc ? "Replace" : "Upload"}
        </Button>
      </div>
    </div>
  );
}

export default function Documents() {
  const { refreshUser } = useAuth();
  const { data: me, mutate } = useSWR("/auth/me", fetcher);
  const [uploading, setUploading] = useState(null);
  const [preview, setPreview] = useState(null);
  const docs = me?.documents || {};

  const handleUpload = async (docType, file) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    setUploading(docType);
    try {
      const uploaded = await uploadToCloudinary(file);
      await api.post("/documents", { doc_type: docType, ...uploaded });
      toast.success("Document uploaded");
      mutate(); refreshUser();
    } catch (e) {
      toast.error(e.response ? formatApiError(e.response.data?.detail) : e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (docType) => {
    try {
      await api.delete(`/documents/${docType}`);
      toast.success("Removed");
      mutate(); refreshUser();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="My Documents" subtitle="Upload your documents for verification. PDF, JPG, JPEG, PNG supported (max 10MB)." />
      <div className="space-y-3">
        {DOCS.map((d) => (
          <DocRow key={d.key} def={d} doc={docs[d.key]} uploading={uploading}
            onUpload={handleUpload} onDelete={handleDelete}
            onPreview={(def, doc) => setPreview({ title: def.label, doc })} />
        ))}
      </div>
      <DocumentPreview doc={preview?.doc} title={preview?.title} open={!!preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  );
}
