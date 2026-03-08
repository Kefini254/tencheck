import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, TrendingUp, Clock, XCircle, Wrench, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const PassportPublic = () => {
  const { tenantId } = useParams<{ tenantId: string }>();

  const { data: passport, isLoading } = useQuery({
    queryKey: ["public-passport", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_credit_passport" as any)
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!tenantId,
  });

  const { data: profile } = useQuery({
    queryKey: ["public-profile", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", tenantId!)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl text-foreground mb-2">Passport Not Found</h1>
          <p className="text-muted-foreground">This tenant credit passport does not exist or hasn't been generated yet.</p>
        </div>
      </div>
    );
  }

  const score = passport.credit_score ?? 50;
  const confidence = passport.confidence_level ?? "low";
  const scoreColor = score >= 80 ? "text-primary" : score >= 60 ? "text-yellow-600" : "text-destructive";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-foreground">TenCheck</h1>
            <p className="text-xs text-muted-foreground">Verified Credit Passport</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-6"
        >
          {/* Tenant Info */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-xl text-accent-foreground">
                {(profile?.name || "T").charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">
                {profile?.name || "Tenant"}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-primary/10 text-primary gap-1 text-xs">
                  <CheckCircle className="h-3 w-3" /> TenCheck Verified
                </Badge>
                <Badge className={`capitalize text-xs ${
                  confidence === "high" ? "bg-primary/10 text-primary" :
                  confidence === "medium" ? "bg-yellow-500/10 text-yellow-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {confidence} confidence
                </Badge>
              </div>
            </div>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-display font-bold ${scoreColor}`}>{score}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={TrendingUp} label="Verified Payments" value={passport.total_verified_rent_payments ?? 0} color="text-primary" />
            <StatBox icon={Clock} label="Late Payments" value={passport.late_payments_count ?? 0} color="text-yellow-600" />
            <StatBox icon={XCircle} label="Missed Payments" value={passport.missed_payments_count ?? 0} color="text-destructive" />
            <StatBox icon={Wrench} label="Services Done" value={passport.total_service_requests_completed ?? 0} color="text-primary" />
          </div>

          {/* Timestamp */}
          <p className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
            Last updated: {passport.updated_at ? new Date(passport.updated_at).toLocaleDateString() : "N/A"}
          </p>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-semibold text-foreground">TenCheck</span> — Building trust in Kenya's rental market
        </p>
      </div>
    </div>
  );
};

const StatBox = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
  <div className="rounded-xl bg-muted/50 p-3 text-center">
    <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
    <p className={`text-lg font-display font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default PassportPublic;
