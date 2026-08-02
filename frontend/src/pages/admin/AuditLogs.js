import React from "react";
import useSWR from "swr";
import { ScrollText, Loader2, User } from "lucide-react";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/shared";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const fetcher = (url) => api.get(url).then((r) => r.data);

const ACTION_CLS = (a) => {
  if (a.includes("approved") || a.includes("verified") || a.includes("unfreeze")) return "text-emerald-600 bg-emerald-500/10";
  if (a.includes("rejected") || a.includes("deleted") || a.includes("freeze")) return "text-rose-600 bg-rose-500/10";
  return "text-blue-600 bg-blue-500/10";
};

export default function AuditLogs() {
  const { data: logs, isLoading } = useSWR("/admin/audit", fetcher);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Every administrative action, tracked with timestamp and actor." />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : logs?.length ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Affected</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} data-testid={`audit-row-${l.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted"><User className="h-4 w-4 text-muted-foreground" /></div>
                      <div>
                        <p className="text-sm font-medium">{l.admin_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{(l.admin_role || "").replace("_", " ")}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className={cn("rounded-md px-2 py-1 text-xs font-semibold capitalize", ACTION_CLS(l.action))}>{l.action.replace(/_/g, " ")}</span></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{l.target_name || "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{l.details || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState icon={ScrollText} title="No audit logs yet" subtitle="Admin actions will be recorded here." testid="audit-empty" />
      )}
    </div>
  );
}
