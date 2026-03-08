import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight, Home, UserCheck, Wifi } from "lucide-react";

const relationLabel: Record<string, { label: string; icon: any; color: string }> = {
  rented_with: { label: "Rented With", icon: Home, color: "text-primary" },
  service_endorsed: { label: "Service Endorsed", icon: Wifi, color: "text-yellow-600" },
  landlord_endorsed: { label: "Landlord Endorsed", icon: UserCheck, color: "text-emerald-600" },
};

export const TrustNetworkPanel = ({ userId }: { userId: string }) => {
  const { data: edges, isLoading } = useQuery({
    queryKey: ["trust-network", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trust_network")
        .select("*")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data?.length) return [];

      // Get profile names for connected users
      const userIds = [...new Set(data.flatMap((e: any) => [e.from_user_id, e.to_user_id]))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, role")
        .in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((e: any) => ({
        ...e,
        from_profile: profileMap[e.from_user_id],
        to_profile: profileMap[e.to_user_id],
      }));
    },
  });

  if (isLoading) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <Users className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Trust Network</h2>
          <p className="text-sm text-muted-foreground">{edges?.length ?? 0} connections</p>
        </div>
      </div>

      {!edges?.length ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No trust connections yet. They build automatically from rentals and endorsements.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {edges.map((e: any) => {
            const rel = relationLabel[e.relation_type] || { label: e.relation_type, icon: Users, color: "text-foreground" };
            const Icon = rel.icon;
            return (
              <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3">
                <Icon className={`h-4 w-4 shrink-0 ${rel.color}`} />
                <div className="flex items-center gap-2 min-w-0 flex-1 text-sm">
                  <span className="font-medium text-foreground truncate">
                    {e.from_profile?.name || "Unknown"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {e.to_profile?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">{rel.label}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">w:{e.weight}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrustNetworkPanel;
