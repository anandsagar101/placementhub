import React, { useState } from "react";
import useSWR from "swr";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Video, Rocket, Clock, Flag,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);
const TYPE_META = {
  interview: { cls: "bg-blue-500 text-white", icon: Video, label: "Interview" },
  drive: { cls: "bg-violet-500 text-white", icon: Rocket, label: "Drive" },
  deadline: { cls: "bg-rose-500 text-white", icon: Clock, label: "Deadline" },
  event: { cls: "bg-emerald-500 text-white", icon: Flag, label: "Event" },
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(iso) { return String(iso).slice(0, 10); }

function CreateEvent({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", date: "", type: "event" });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post("/events", f); toast.success("Event created"); setOpen(false); onCreated(); }
    catch (err) { toast.error(formatApiError(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full" data-testid="create-event-btn"><Plus className="mr-2 h-4 w-4" /> Add event</Button></DialogTrigger>
      <DialogContent data-testid="create-event-dialog">
        <DialogHeader><DialogTitle>Create Placement Event</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div><Label className="mb-2 block text-sm">Title</Label><Input required value={f.title} onChange={(e) => setF((s) => ({ ...s, title: e.target.value }))} data-testid="event-title" /></div>
          <div><Label className="mb-2 block text-sm">Date</Label><Input type="date" required value={f.date} onChange={(e) => setF((s) => ({ ...s, date: e.target.value }))} data-testid="event-date" /></div>
          <div><Label className="mb-2 block text-sm">Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF((s) => ({ ...s, description: e.target.value }))} data-testid="event-desc" /></div>
          <Button type="submit" disabled={saving} className="w-full rounded-full" data-testid="event-submit">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Calendar() {
  const { user } = useAuth();
  const { data: items, isLoading, mutate } = useSWR("/calendar", fetcher);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const byDay = {};
  (items || []).forEach((it) => { const k = dayKey(it.date); (byDay[k] = byDay[k] || []).push(it); });

  const first = new Date(cursor.y, cursor.m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const todayKey = dayKey(new Date().toISOString());

  const shift = (delta) => setCursor((c) => { const m = c.m + delta; return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 }; });

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Interviews, campus drives, deadlines and placement events at a glance.">
        {user?.role === "admin" && <CreateEvent onCreated={mutate} />}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {Object.entries(TYPE_META).map(([k, m]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className={cn("h-2.5 w-2.5 rounded-full", m.cls.split(" ")[0])} /> {m.label}</span>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold">{MONTHS[cursor.m]} {cursor.y}</h3>
          <div className="flex gap-1">
            <button onClick={() => shift(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border" data-testid="cal-prev"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => shift(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border" data-testid="cal-next"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {DOW.map((d) => <div key={d} className="pb-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
            {cells.map((d, i) => {
              if (d === null) return <div key={`e${i}`} />;
              const key = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const dayItems = byDay[key] || [];
              const isToday = key === todayKey;
              return (
                <div key={key} className={cn("min-h-[84px] rounded-lg border p-1.5", isToday ? "border-primary bg-primary/5" : "border-border")} data-testid={`cal-day-${key}`}>
                  <div className={cn("mb-1 text-xs font-semibold", isToday && "text-primary")}>{d}</div>
                  <div className="space-y-1">
                    {dayItems.slice(0, 3).map((it, j) => {
                      const m = TYPE_META[it.type] || TYPE_META.event;
                      return <div key={j} className={cn("truncate rounded px-1 py-0.5 text-[10px] font-medium", m.cls)} title={it.title}>{it.title}</div>;
                    })}
                    {dayItems.length > 3 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
