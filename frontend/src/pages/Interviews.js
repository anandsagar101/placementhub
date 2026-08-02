import React, { useState } from "react";
import useSWR from "swr";
import {
  CalendarClock, Loader2, Video, MapPin, Phone, Clock, User, Link2, CheckCircle2,
  RotateCw, XCircle, ClipboardCheck, Star,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import FeedbackDialog from "@/components/FeedbackDialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);
const STATUS_CLS = {
  scheduled: "bg-blue-500/10 text-blue-600", rescheduled: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600", cancelled: "bg-rose-500/10 text-rose-600",
  no_show: "bg-slate-500/10 text-slate-600",
};
const MODE_ICON = { Online: Video, Offline: MapPin, Phone: Phone };

function FeedbackView({ fb }) {
  const rows = [["Communication", fb.communication], ["Technical", fb.technical_skills], ["Problem Solving", fb.problem_solving], ["Confidence", fb.confidence], ["Overall", fb.overall_rating]];
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-primary" /> Feedback · <span className={cn("capitalize", fb.status === "pass" ? "text-emerald-600" : fb.status === "fail" ? "text-rose-600" : "text-amber-600")}>{fb.status}</span></p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
        {rows.map(([l, v]) => <span key={l} className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3 text-amber-500" /> {l}: <b className="text-foreground">{v}/10</b></span>)}
      </div>
      {fb.recommendation && <p className="mt-2 text-xs text-muted-foreground">Recommendation: {fb.recommendation}</p>}
      {fb.comments && <p className="mt-1 text-xs text-muted-foreground">{fb.comments}</p>}
    </div>
  );
}

export default function Interviews() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const { data: ivs, isLoading, mutate } = useSWR(isStudent ? "/interviews/me" : "/interviews/company", fetcher);
  const [feedbackFor, setFeedbackFor] = useState(null);

  const respond = async (id, response) => { try { await api.patch(`/interviews/${id}/respond`, { response }); toast.success(response === "accepted" ? "Interview accepted" : "Reschedule requested"); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };
  const updateStatus = async (id, status) => { try { await api.patch(`/interviews/${id}`, { status }); toast.success("Updated"); mutate(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } };

  return (
    <div>
      <PageHeader title="Interviews" subtitle={isStudent ? "Your scheduled interview rounds and results." : "Manage interviews and submit feedback."} />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : ivs?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {ivs.map((iv) => {
            const MIcon = MODE_ICON[iv.mode] || Video;
            return (
              <div key={iv.id} className="rounded-xl border border-border bg-card p-5" data-testid={`interview-${iv.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-semibold">{iv.round_type} <span className="text-sm font-normal text-muted-foreground">· Round {iv.round_number}</span></h3>
                    <p className="text-sm text-muted-foreground">{isStudent ? iv.company_name : iv.student?.name}{iv.drive_title ? ` · ${iv.drive_title}` : ""}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", STATUS_CLS[iv.status])}>{iv.status.replace("_", " ")}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {iv.date} · {iv.time} ({iv.duration})</span>
                  <span className="inline-flex items-center gap-1.5"><MIcon className="h-4 w-4" /> {iv.mode}</span>
                  {iv.interviewer_name && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> {iv.interviewer_name}</span>}
                </div>
                {(iv.meeting_link || iv.venue) && (
                  <p className="mt-2 text-sm">
                    {iv.meeting_link ? <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><Link2 className="h-3.5 w-3.5" /> Join link</a> : <span className="inline-flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {iv.venue}</span>}
                  </p>
                )}
                {iv.instructions && <p className="mt-1 text-xs text-muted-foreground">{iv.instructions}</p>}
                {isStudent && iv.student_response && iv.student_response !== "pending" && (
                  <p className="mt-2 text-xs font-medium text-primary capitalize">You: {iv.student_response.replace("_", " ")}</p>
                )}
                {iv.feedback && <FeedbackView fb={iv.feedback} />}

                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  {isStudent && iv.status !== "completed" && iv.status !== "cancelled" && iv.student_response === "pending" && (
                    <>
                      <Button size="sm" className="rounded-full" onClick={() => respond(iv.id, "accepted")} data-testid={`accept-iv-${iv.id}`}><CheckCircle2 className="mr-1 h-4 w-4" /> Accept</Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => respond(iv.id, "reschedule_requested")} data-testid={`reschedule-req-${iv.id}`}><RotateCw className="mr-1 h-4 w-4" /> Request reschedule</Button>
                    </>
                  )}
                  {!isStudent && (
                    <>
                      <Select value={iv.status} onValueChange={(v) => updateStatus(iv.id, v)}>
                        <SelectTrigger className="h-9 w-40 rounded-full text-xs" data-testid={`iv-status-${iv.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="rescheduled">Rescheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="no_show">No Show</SelectItem>
                        </SelectContent>
                      </Select>
                      {!iv.feedback && <Button size="sm" variant="outline" className="rounded-full" onClick={() => setFeedbackFor(iv.id)} data-testid={`feedback-btn-${iv.id}`}><ClipboardCheck className="mr-1 h-4 w-4" /> Feedback</Button>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={CalendarClock} title="No interviews yet" subtitle={isStudent ? "Scheduled interviews will appear here." : "Schedule interviews from a drive's pipeline."} testid="interviews-empty" />
      )}

      {feedbackFor && <FeedbackDialog open={!!feedbackFor} onOpenChange={(o) => !o && setFeedbackFor(null)} interviewId={feedbackFor} onSubmitted={mutate} />}
    </div>
  );
}
