import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { Bell, Check } from "lucide-react";
import api from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);

const TYPE_COLORS = {
  verification: "bg-blue-500", document: "bg-violet-500", application: "bg-indigo-500",
  offer: "bg-emerald-500", freeze: "bg-rose-500", approval: "bg-amber-500",
  recruiter_request: "bg-amber-500", student_registration: "bg-blue-500",
};

function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

export default function NotificationBell() {
  const { data, mutate } = useSWR("/notifications", fetcher, { refreshInterval: 20000 });
  const items = data?.items || [];
  const unread = data?.unread || 0;

  const markAll = async () => { await api.patch("/notifications/read-all"); mutate(); };
  const readOne = async (id) => { await api.patch(`/notifications/${id}/read`); mutate(); };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
          data-testid="notification-bell"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" data-testid="notif-unread-count">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-heading text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-primary hover:underline" data-testid="mark-all-read">
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length ? items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read && readOne(n.id)}
              className={cn("flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50",
                !n.read && "bg-primary/5")}
              data-testid={`notif-${n.id}`}
            >
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_COLORS[n.type] || "bg-slate-400")} />
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
            </button>
          )) : (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">You're all caught up 🎉</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
