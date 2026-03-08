import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ScoreGauge,
  ConfidenceBadge,
  PhoneVerifiedBadge,
  PaymentTimeline,
  DisputeForm,
} from "@/components/dashboard/TenantProfile";

const TenantProfilePage = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  const { data: tenant } = useQuery({
    queryKey: ["my-tenant-record", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: score } = useQuery({
    queryKey: ["my-score-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_scores")
        .select("*")
        .eq("tenant_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: records } = useQuery({
    queryKey: ["my-rental-records", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("rental_records")
        .select("*")
        .eq("tenant_id", user!.id)
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-3xl flex items-center h-16 px-4 gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <Shield className="h-5 w-5 text-primary" />
            TenCheck
          </Link>
          <span className="text-sm text-muted-foreground ml-auto">My Profile</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl p-4 sm:p-6 space-y-6">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={score?.score ?? 100} />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-display font-bold text-2xl text-foreground">
                {profile?.name || tenant?.name || "Tenant"}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                <PhoneVerifiedBadge verified={tenant?.phone_verified ?? false} />
                {tenant?.identity_verified && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Shield className="h-3 w-3" /> ID Verified
                  </span>
                )}
                <ConfidenceBadge level={score?.confidence_level || "low"} />
              </div>
              <div className="flex gap-4 mt-3 text-sm justify-center sm:justify-start">
                <div><span className="font-bold text-foreground">{score?.total_payments ?? 0}</span> <span className="text-muted-foreground text-xs">payments</span></div>
                <div><span className="font-bold text-foreground">{score?.data_sources_count ?? 0}</span> <span className="text-muted-foreground text-xs">landlords</span></div>
                <div><span className="font-bold text-primary">{score?.verified_sms_payments ?? 0}</span> <span className="text-muted-foreground text-xs">verified</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Payment Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="font-display font-bold text-lg text-foreground mb-4">Payment Timeline</h2>
          <PaymentTimeline tenantId={user.id} />
        </motion.div>

        {/* Disputes */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <DisputeForm tenantId={user.id} rentalRecords={records || []} />
        </motion.div>
      </main>
    </div>
  );
};

export default TenantProfilePage;
