import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield, Phone, CheckCircle, AlertTriangle, Clock,
  FileText, ChevronDown, ChevronUp, Upload, XCircle,
  TrendingUp, Users, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Score Gauge component
const ScoreGauge = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70 ? "hsl(var(--primary))" : score >= 40 ? "hsl(45, 80%, 50%)" : "hsl(var(--destructive))";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-2xl font-bold text-foreground">{score}</span>
        <span className="block text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

// Confidence Badge
const ConfidenceBadge = ({ level }: { level: string }) => {
  const config: Record<string, { color: string; label: string }> = {
    high: { color: "bg-primary/10 text-primary border-primary/20", label: "High Confidence" },
    medium: { color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", label: "Medium Confidence" },
    low: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Low Confidence" },
  };
  const c = config[level] || config.low;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${c.color}`}>
      <TrendingUp className="h-3 w-3" />
      {c.label}
    </span>
  );
};

// Phone Verified Badge
const PhoneVerifiedBadge = ({ verified }: { verified: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
    verified ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
  }`}>
    <Phone className="h-3 w-3" />
    {verified ? "Phone Verified" : "Unverified"}
  </span>
);

// Payment Timeline
export const PaymentTimeline = ({ tenantId }: { tenantId: string }) => {
  const { data: records, isLoading } = useQuery({
    queryKey: ["payment-timeline", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rental_records")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const { data: evidence } = useQuery({
    queryKey: ["evidence-lookup", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_evidence")
        .select("tenant_id, payment_date, verification_status")
        .eq("tenant_id", tenantId);
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!records?.length) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
        <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No payment records yet</p>
      </div>
    );
  }

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    paid: { icon: CheckCircle, color: "text-primary", label: "Paid On Time" },
    late: { icon: Clock, color: "text-yellow-600", label: "Late" },
    missed: { icon: XCircle, color: "text-destructive", label: "Missed" },
  };

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-1">
        {records.map((record: any, i: number) => {
          const cfg = statusConfig[record.payment_status] || statusConfig.paid;
          const Icon = cfg.icon;
          const hasEvidence = evidence?.some(
            (e: any) => e.payment_date === record.payment_date && e.verification_status === "verified"
          );

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-12 py-3"
            >
              <div className={`absolute left-3 top-4 h-5 w-5 rounded-full bg-background border-2 flex items-center justify-center ${
                record.payment_status === "paid" ? "border-primary" :
                record.payment_status === "late" ? "border-yellow-500" : "border-destructive"
              }`}>
                <Icon className={`h-3 w-3 ${cfg.color}`} />
              </div>
              <div className="rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Ksh {record.rent_amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.payment_date || "No date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasEvidence && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <FileText className="h-2.5 w-2.5" /> Evidence
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        record.payment_status === "paid" ? "bg-primary/10 text-primary" :
                        record.payment_status === "late" ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Dispute Form
export const DisputeForm = ({ tenantId, rentalRecords }: { tenantId: string; rentalRecords: any[] }) => {
  const [showForm, setShowForm] = useState(false);
  const [recordId, setRecordId] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: disputes } = useQuery({
    queryKey: ["my-disputes", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!tenantId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("disputes").insert({
      tenant_id: tenantId,
      rental_record_id: recordId || null,
      dispute_reason: reason,
      evidence_url: evidenceUrl || null,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Dispute submitted");
      setShowForm(false);
      setReason("");
      setEvidenceUrl("");
      setRecordId("");
      queryClient.invalidateQueries({ queryKey: ["my-disputes"] });
    }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    under_review: "bg-blue-500/10 text-blue-600",
    resolved: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-foreground">Disputes</h3>
        <Button
          size="sm"
          variant={showForm ? "outline" : "default"}
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {showForm ? "Cancel" : "Report Incorrect Record"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {rentalRecords?.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Related Record (optional)</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={recordId}
                    onChange={(e) => setRecordId(e.target.value)}
                  >
                    <option value="">Select a record...</option>
                    {rentalRecords.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.payment_date} — Ksh {r.rent_amount?.toLocaleString()} ({r.payment_status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Reason</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this record is incorrect..."
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Evidence URL (screenshot / bank proof)</Label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Dispute"}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {disputes && disputes.length > 0 && (
        <div className="space-y-2">
          {disputes.map((d: any) => (
            <div key={d.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-foreground">{d.dispute_reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={`text-[10px] ${statusColor[d.status] || ""}`}>
                  {d.status?.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Full Tenant Profile Card (used in landlord search results)
export const TenantProfileCard = ({ tenant, score }: { tenant: any; score: any }) => {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreGauge score={score?.score ?? 100} />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-bold text-xl text-foreground">{tenant.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
              <PhoneVerifiedBadge verified={tenant.phone_verified} />
              {tenant.identity_verified && (
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/20 text-primary">
                  <Shield className="h-3 w-3" /> ID Verified
                </Badge>
              )}
              <ConfidenceBadge level={score?.confidence_level || "low"} />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Phone: {tenant.phone} {tenant.national_id ? `• ID: ${tenant.national_id.substring(0, 3)}***` : ""}
            </p>

            {/* Stats */}
            <div className="flex gap-4 mt-3 text-sm">
              <div className="text-center">
                <p className="font-bold text-foreground">{score?.total_payments ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-yellow-600">{score?.late_payments ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-destructive">{score?.missed_payments ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Missed</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-primary">{score?.verified_sms_payments ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Verified</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {score?.data_sources_count ?? 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Landlords</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline toggle */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Payment Timeline
          {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <AnimatePresence>
          {showTimeline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0">
                <PaymentTimeline tenantId={tenant.user_id || tenant.id} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export { ScoreGauge, ConfidenceBadge, PhoneVerifiedBadge };
