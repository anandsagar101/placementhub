import React, { useState } from "react";
import { Loader2, CalendarPlus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";

const ROUND_TYPES = ["Group Discussion", "Technical Round", "HR Round", "Managerial Round"];
const MODES = ["Online", "Offline", "Phone"];

export default function InterviewScheduleDialog({ open, onOpenChange, studentId, driveId, studentName, onScheduled }) {
  const [f, setF] = useState({
    round_type: "Technical Round", round_number: 1, mode: "Online", date: "", time: "",
    duration: "30 mins", venue: "", meeting_link: "", instructions: "", interviewer_name: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/interviews", {
        student_id: studentId, drive_id: driveId,
        round_type: f.round_type, round_number: Number(f.round_number), mode: f.mode,
        date: f.date, time: f.time, duration: f.duration, venue: f.venue || null,
        meeting_link: f.meeting_link || null, instructions: f.instructions || null,
        interviewer_name: f.interviewer_name || null,
      });
      toast.success("Interview scheduled");
      onScheduled && onScheduled();
      onOpenChange(false);
    } catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" data-testid="schedule-interview-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" /> Schedule Interview</DialogTitle>
          <DialogDescription>{studentName ? `For ${studentName}` : "Set up an interview round"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-2 block text-sm">Round type</Label>
            <Select value={f.round_type} onValueChange={(v) => setF((s) => ({ ...s, round_type: v }))}>
              <SelectTrigger data-testid="iv-round-type"><SelectValue /></SelectTrigger>
              <SelectContent>{ROUND_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-2 block text-sm">Round number</Label><Input type="number" value={f.round_number} onChange={set("round_number")} data-testid="iv-round-number" /></div>
          <div>
            <Label className="mb-2 block text-sm">Mode</Label>
            <Select value={f.mode} onValueChange={(v) => setF((s) => ({ ...s, mode: v }))}>
              <SelectTrigger data-testid="iv-mode"><SelectValue /></SelectTrigger>
              <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="mb-2 block text-sm">Duration</Label><Input value={f.duration} onChange={set("duration")} data-testid="iv-duration" /></div>
          <div><Label className="mb-2 block text-sm">Date</Label><Input type="date" required value={f.date} onChange={set("date")} data-testid="iv-date" /></div>
          <div><Label className="mb-2 block text-sm">Time</Label><Input type="time" required value={f.time} onChange={set("time")} data-testid="iv-time" /></div>
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">{f.mode === "Offline" ? "Venue" : "Meeting link"}</Label><Input value={f.mode === "Offline" ? f.venue : f.meeting_link} onChange={f.mode === "Offline" ? set("venue") : set("meeting_link")} placeholder={f.mode === "Offline" ? "Room / address" : "https://meet..."} data-testid="iv-location" /></div>
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">Interviewer</Label><Input value={f.interviewer_name} onChange={set("interviewer_name")} data-testid="iv-interviewer" /></div>
          <div className="sm:col-span-2"><Label className="mb-2 block text-sm">Instructions</Label><Textarea rows={2} value={f.instructions} onChange={set("instructions")} data-testid="iv-instructions" /></div>
          <Button type="submit" disabled={saving} className="sm:col-span-2 rounded-full" data-testid="iv-submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
