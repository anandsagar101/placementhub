import React from "react";
import useSWR from "swr";
import {
  Award, Loader2, IndianRupee, MapPin, Calendar, Building2, Briefcase, CheckCircle2, XCircle,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url) => api.get(url).then((r) => r.data);

const OFFER_STATUS = {
  offered: { cls: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Pending Response" },
  accepted: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", label: "Accepted" },
  declined: { cls: "bg-rose-500/10 text-rose-600 border-rose-500/20", label: "Declined" },
};

export default function Offers() {
  const { refreshUser } = useAuth();
  const { data: offers, isLoading, mutate } = useSWR("/offers/me", fetcher);

  const respond = async (id, status) => {
    try {
      await api.patch(`/offers/${id}`, { status });
      toast.success(status === "accepted" ? "Offer accepted! You're placed 🎉" : "Offer declined");
      mutate(); refreshUser();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="My Offers" subtitle="Compare offers and respond. Accepting an offer marks you as placed." />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : offers?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {offers.map((o) => {
            const st = OFFER_STATUS[o.status] || OFFER_STATUS.offered;
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-6" data-testid={`offer-${o.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{o.company_name}</h3>
                      <p className="text-sm text-muted-foreground">{o.role}</p>
                    </div>
                  </div>
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", st.cls)}>{st.label}</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><IndianRupee className="h-3.5 w-3.5" /> Package</p>
                    <p className="mt-1 font-heading text-lg font-bold">{o.package} LPA</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> Location</p>
                    <p className="mt-1 font-medium">{o.location || "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Joining</p>
                    <p className="mt-1 font-medium">{o.joining_date || "TBD"}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> Bond</p>
                    <p className="mt-1 font-medium">{o.bond || "None"}</p>
                  </div>
                </div>
                {o.benefits && <p className="mt-3 text-sm text-muted-foreground">Benefits: {o.benefits}</p>}

                {o.status === "offered" && (
                  <div className="mt-5 flex gap-3">
                    <Button onClick={() => respond(o.id, "accepted")} className="flex-1 rounded-full" data-testid={`accept-offer-${o.id}`}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Accept
                    </Button>
                    <Button onClick={() => respond(o.id, "declined")} variant="outline" className="flex-1 rounded-full" data-testid={`decline-offer-${o.id}`}>
                      <XCircle className="mr-1 h-4 w-4" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Award} title="No offers yet" subtitle="Offers appear here once a recruiter selects you." testid="offers-empty" />
      )}
    </div>
  );
}
