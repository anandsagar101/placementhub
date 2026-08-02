import React, { useState } from "react";
import { Loader2, ClipboardCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const FIELDS = [
  ["communication", "Communication"], ["technical_skills", "Technical Skills"],
  ["problem_solving", "Problem Solving"], ["confidence", "Confidence"], ["overall_rating", "Overall Rating"],
];

function Rating({ label, value, onChange, testid }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm"><span>{label}</span><span className="font-semibold">{value}/10</span></div>
      <input type="range" min="1" max="10" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[hsl(var(--primary))]" data-testid={testid} />
    </div>
  );
}

export default function FeedbackDialog({ open, onOpenChange, interviewId, onSubmitted }) {
  const [f, setF] = useState({ communication: 7, technical_skills: 7, problem_solving: 7, confidence: 7, overall_rating: 7, recommendation: "", comments: "", status: "hold" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post(`/interviews/${interviewId}/feedback`, f);
      toast.success("Feedback submitted");
      onSubmitted && onSubmitted();
      onOpenChange(false);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="feedback-dialog">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Interview Feedback</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {FIELDS.map(([k, l]) => <Rating key={k} label={l} value={f[k]} onChange={(v) => set(k, v)} testid={`fb-${k}`} />)}
          <div>
            <Label className="mb-2 block text-sm">Result</Label>
            <Select value={f.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger data-testid="fb-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="mb-2 block text-sm">Recommendation</Label><Textarea rows={2} value={f.recommendation} onChange={(e) => set("recommendation", e.target.value)} placeholder="e.g. Strong hire" data-testid="fb-recommendation" /></div>
          <div><Label className="mb-2 block text-sm">Comments</Label><Textarea rows={3} value={f.comments} onChange={(e) => set("comments", e.target.value)} data-testid="fb-comments" /></div>
          <Button type="submit" disabled={saving} className="w-full rounded-full" data-testid="fb-submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit feedback</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
