import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Scale, ExternalLink } from "lucide-react";

const statusVariant = (s: string) => {
  if (s === "resolved") return "default";
  if (s === "escalated") return "destructive";
  return "secondary";
};

export const DisputeOverviewPanel = ({ userId, role }: { userId: string; role: "landlord" | "tenant" }) => {
  const { data: disputes, isLoading } = useQuery({
    queryKey: ["disputes-overview", userId, role],
    queryFn: async () => {
      let query = supabase.from("disputes").select("*").order("created_at", { ascending: false }).limit(20);

      if (role === "tenant") {
        query = query.eq("tenant_id", userId);
      } else {
        query = query.eq("landlord_id", userId);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="h-40 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <Scale className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Dispute Overview</h2>
          <p className="text-sm text-muted-foreground">{disputes?.length ?? 0} recorded disputes</p>
        </div>
      </div>

      {!disputes?.length ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <Scale className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No disputes recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((d: any) => (
            <div key={d.id} className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-[10px]">{d.dispute_type || "payment"}</Badge>
                    <Badge variant={statusVariant(d.resolution_status || d.status)} className="capitalize text-[10px]">
                      {d.resolution_status || d.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mt-2">{d.dispute_reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                {d.evidence_url && (
                  <a href={d.evidence_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline shrink-0">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisputeOverviewPanel;
