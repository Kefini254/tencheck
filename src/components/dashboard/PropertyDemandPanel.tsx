import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Home, DollarSign } from "lucide-react";

export const PropertyDemandPanel = () => {
  const { data: demand, isLoading } = useQuery({
    queryKey: ["property-demand"],
    queryFn: async () => {
      // Refresh demand data
      await supabase.rpc("refresh_property_demand");
      const { data } = await supabase
        .from("property_demand")
        .select("*")
        .order("total_searches", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <MapPin className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Property Demand Insights</h2>
          <p className="text-sm text-muted-foreground">Market activity by location</p>
        </div>
      </div>

      {demand?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No demand data yet. List properties to generate insights.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demand?.map((d: any) => {
            const vacPercent = Math.round((d.vacancy_rate ?? 0) * 100);
            return (
              <div key={d.id} className="rounded-xl border border-border bg-muted/20 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-foreground truncate">
                      {d.location_city?.trim()}{d.location_county?.trim() ? `, ${d.location_county.trim()}` : ""}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Home className="h-3.5 w-3.5" /> {d.total_searches} properties
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" /> Ksh {(d.average_rent ?? 0).toLocaleString()} avg
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant={vacPercent > 50 ? "destructive" : vacPercent > 25 ? "secondary" : "default"}>
                      {vacPercent}% vacant
                    </Badge>
                  </div>
                </div>
                {/* Simple bar */}
                <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, vacPercent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PropertyDemandPanel;
