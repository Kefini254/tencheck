import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldCheck, ShieldAlert, TrendingDown } from "lucide-react";

const riskColor = (cat: string) => {
  if (cat === "low") return "text-primary";
  if (cat === "medium") return "text-yellow-600";
  return "text-destructive";
};

const riskIcon = (cat: string) => {
  if (cat === "low") return ShieldCheck;
  if (cat === "medium") return AlertTriangle;
  return ShieldAlert;
};

export const TenantRiskPanel = ({ tenantId, showTitle = true }: { tenantId: string; showTitle?: boolean }) => {
  const { data: risk, isLoading } = useQuery({
    queryKey: ["tenant-risk", tenantId],
    queryFn: async () => {
      // Try to calculate fresh
      await supabase.rpc("calculate_tenant_risk", { _tenant_id: tenantId });
      const { data } = await supabase
        .from("tenant_risk")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) return <div className="h-40 rounded-2xl bg-muted animate-pulse" />;

  const cat = risk?.risk_category || "medium";
  const Icon = riskIcon(cat);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      {showTitle && (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent">
            <TrendingDown className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Tenant Risk Assessment</h2>
            <p className="text-sm text-muted-foreground">AI-powered risk prediction</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-6">
        {/* Score circle */}
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={cat === "low" ? "hsl(var(--primary))" : cat === "medium" ? "#ca8a04" : "hsl(var(--destructive))"}
              strokeWidth="8"
              strokeDasharray={`${(risk?.risk_score ?? 50) * 2.64} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-display font-bold ${riskColor(cat)}`}>{risk?.risk_score ?? 50}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Risk</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${riskColor(cat)}`} />
            <Badge variant={cat === "low" ? "default" : cat === "medium" ? "secondary" : "destructive"} className="capitalize">
              {cat} Risk
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="font-bold text-foreground">{risk?.verified_payments_count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Verified</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="font-bold text-yellow-600">{risk?.late_payments_count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Late</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="font-bold text-destructive">{risk?.missed_payments_count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Missed</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="font-bold text-foreground">{risk?.disputes_count ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Disputes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenantRiskPanel;
