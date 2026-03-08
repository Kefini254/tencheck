import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Clock, XCircle, Wrench } from "lucide-react";

interface CreditPassportCardProps {
  userId: string;
}

const CreditPassportCard = ({ userId }: CreditPassportCardProps) => {
  const { data: passport, isLoading } = useQuery({
    queryKey: ["credit-passport", userId],
    queryFn: async () => {
      // Try to recalculate first
      await supabase.rpc("calculate_credit_passport", { _tenant_id: userId });

      const { data } = await supabase
        .from("tenant_credit_passport" as any)
        .select("*")
        .eq("tenant_id", userId)
        .maybeSingle();
      return data as any;
    },
  });

  if (isLoading) {
    return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;
  }

  const score = passport?.credit_score ?? 50;
  const confidence = passport?.confidence_level ?? "low";

  const scoreColor =
    score >= 80 ? "text-primary" : score >= 60 ? "text-yellow-600" : "text-destructive";

  const confidenceColor =
    confidence === "high"
      ? "bg-primary/10 text-primary"
      : confidence === "medium"
      ? "bg-yellow-500/10 text-yellow-600"
      : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Credit Passport</h2>
          <p className="text-sm text-muted-foreground">Your portable financial profile</p>
        </div>
        <Badge className={`ml-auto capitalize ${confidenceColor}`}>{confidence} confidence</Badge>
      </div>

      {/* Score */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 264} 264`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-display font-bold ${scoreColor}`}>{score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 flex-1">
          <StatBox
            icon={TrendingUp}
            label="Verified Payments"
            value={passport?.total_verified_rent_payments ?? 0}
            color="text-primary"
          />
          <StatBox
            icon={Clock}
            label="Late Payments"
            value={passport?.late_payments_count ?? 0}
            color="text-yellow-600"
          />
          <StatBox
            icon={XCircle}
            label="Missed Payments"
            value={passport?.missed_payments_count ?? 0}
            color="text-destructive"
          />
          <StatBox
            icon={Wrench}
            label="Services Done"
            value={passport?.total_service_requests_completed ?? 0}
            color="text-primary"
          />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
}) => (
  <div className="rounded-xl bg-muted/50 p-3 text-center">
    <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
    <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default CreditPassportCard;
