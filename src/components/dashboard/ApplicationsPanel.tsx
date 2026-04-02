import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, CheckCircle, XCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  userId: string;
}

const ApplicationsPanel = ({ userId }: Props) => {
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ["landlord-applications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("property_applications")
        .select("*, properties(title, location, rent_amount)")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];

      const tenantIds = [...new Set(data.map(a => a.tenant_id))];
      const [{ data: profiles }, { data: scores }, { data: passports }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email").in("user_id", tenantIds),
        supabase.from("tenant_scores").select("tenant_id, score, confidence_level").in("tenant_id", tenantIds),
        supabase.from("tenant_credit_passport").select("tenant_id, credit_score, confidence_level").in("tenant_id", tenantIds),
      ]);

      const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.user_id, p]));
      const scoreMap = Object.fromEntries((scores ?? []).map(s => [s.tenant_id, s]));
      const passportMap = Object.fromEntries((passports ?? []).map(p => [p.tenant_id, p]));

      return data.map(app => ({
        ...app,
        tenant_profile: profileMap[app.tenant_id],
        tenant_score: scoreMap[app.tenant_id],
        tenant_passport: passportMap[app.tenant_id],
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("property_applications")
        .update({ application_status: status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`Application ${status}!`);
      queryClient.invalidateQueries({ queryKey: ["landlord-applications"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pending = (applications ?? []).filter((a: any) => a.application_status === "pending");
  const resolved = (applications ?? []).filter((a: any) => a.application_status !== "pending");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <ClipboardList className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Tenant Applications</h2>
          <p className="text-sm text-muted-foreground">{pending.length} pending, {resolved.length} resolved</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : pending.length === 0 && resolved.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No applications yet. Share your property links to attract tenants!</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Review</h3>
              {pending.map((app: any) => (
                <ApplicationCard key={app.id} app={app} onApprove={() => updateStatus.mutate({ id: app.id, status: "approved" })} onReject={() => updateStatus.mutate({ id: app.id, status: "rejected" })} isPending={updateStatus.isPending} />
              ))}
            </div>
          )}
          {resolved.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Resolved</h3>
              {resolved.map((app: any) => (
                <ApplicationCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ApplicationCard = ({ app, onApprove, onReject, isPending }: { app: any; onApprove?: () => void; onReject?: () => void; isPending?: boolean }) => {
  const score = app.tenant_score?.score ?? app.tenant_passport?.credit_score;
  const scoreColor = score >= 80 ? "text-primary" : score >= 60 ? "text-yellow-600" : "text-destructive";

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{app.tenant_profile?.name || "Unknown tenant"}</p>
            <p className="text-xs text-muted-foreground">{app.properties?.title} — {app.properties?.location}</p>
            {app.message && <p className="text-xs text-muted-foreground mt-1 italic">"{app.message}"</p>}
            <div className="flex items-center gap-3 mt-2">
              {score != null && (
                <span className={`text-xs font-bold ${scoreColor}`}>Trust Score: {score}</span>
              )}
              <span className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {app.application_status === "pending" && onApprove && onReject ? (
            <>
              <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={onReject} disabled={isPending}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" className="gap-1" onClick={onApprove} disabled={isPending}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
            </>
          ) : (
            <Badge variant={app.application_status === "approved" ? "default" : "destructive"} className="capitalize">
              {app.application_status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationsPanel;
