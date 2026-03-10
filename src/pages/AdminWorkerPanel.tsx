import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, CheckCircle, XCircle, Search, Eye, EyeOff } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminWorkerPanel = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");

  const { data: workers, isLoading } = useQuery({
    queryKey: ["admin-workers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_worker_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (!data) return [];
      // Fetch profile names for each worker
      const userIds = data.map((w: any) => w.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, phone")
        .in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((w: any) => ({ ...w, profile: profileMap.get(w.user_id) || null }));
    },
  });

  const updateWorker = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const { error } = await supabase
        .from("service_worker_profiles")
        .update(updates)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Worker updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-workers"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = workers?.filter((w: any) =>
    w.service_category?.toLowerCase().includes(filter.toLowerCase()) ||
    w.city?.toLowerCase().includes(filter.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="font-display font-bold text-xl text-foreground">Worker Management</h2>
      </div>

      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter by category or city..." className="pl-10" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workers found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((worker: any) => (
            <div key={worker.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{worker.service_category}</p>
                  <p className="text-xs text-muted-foreground">City: {worker.city || "Not set"} • Experience: {worker.years_experience || 0} yrs • Jobs: {worker.jobs_completed || 0}</p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={worker.verification_status === "verified" ? "bg-primary/10 text-primary" : worker.verification_status === "suspended" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600"}>
                      {worker.verification_status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      {worker.visibility_status === "public" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {worker.visibility_status}
                    </Badge>
                    {worker.identity_document_url && (
                      <a href={worker.identity_document_url} target="_blank" rel="noopener" className="text-[10px] text-primary underline">View ID</a>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {worker.verification_status !== "verified" && (
                    <Button size="sm" onClick={() => updateWorker.mutate({ userId: worker.user_id, updates: { verification_status: "verified" } })}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Verify
                    </Button>
                  )}
                  {worker.verification_status !== "suspended" && (
                    <Button size="sm" variant="destructive" onClick={() => updateWorker.mutate({ userId: worker.user_id, updates: { verification_status: "suspended" } })}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Suspend
                    </Button>
                  )}
                  {worker.verification_status === "suspended" && (
                    <Button size="sm" variant="outline" onClick={() => updateWorker.mutate({ userId: worker.user_id, updates: { verification_status: "pending" } })}>
                      Unsuspend
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminWorkerPanel;
