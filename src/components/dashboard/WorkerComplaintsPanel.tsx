import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Flag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// User-facing: file a complaint about a worker
export const FileWorkerComplaint = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [workerPhone, setWorkerPhone] = useState("");
  const [complaintType, setComplaintType] = useState("quality");
  const [description, setDescription] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { data: worker } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", workerPhone)
        .eq("role", "service_worker")
        .maybeSingle();
      if (!worker) throw new Error("Worker not found with that phone");
      const { error } = await supabase.from("worker_complaints").insert({
        worker_id: worker.user_id,
        requester_id: userId,
        complaint_type: complaintType,
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint filed");
      queryClient.invalidateQueries({ queryKey: ["my-complaints"] });
      setWorkerPhone(""); setDescription("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: myComplaints } = useQuery({
    queryKey: ["my-complaints", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("worker_complaints")
        .select("*")
        .eq("requester_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-foreground text-sm">File a Worker Complaint</h3>
        </div>
        <Input placeholder="Worker phone number" value={workerPhone} onChange={e => setWorkerPhone(e.target.value)} required />
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={complaintType}
          onChange={e => setComplaintType(e.target.value)}
        >
          <option value="quality">Quality Issue</option>
          <option value="no_show">No Show</option>
          <option value="fraud">Fraud</option>
          <option value="unprofessional">Unprofessional Behavior</option>
          <option value="other">Other</option>
        </select>
        <Textarea placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)} rows={3} required />
        <Button onClick={() => submit.mutate()} disabled={submit.isPending} variant="destructive" className="w-full">
          {submit.isPending ? "Submitting..." : "File Complaint"}
        </Button>
      </div>

      {myComplaints && myComplaints.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Your Complaints</h3>
          {myComplaints.map((c: any) => (
            <div key={c.id} className="rounded-lg border border-border p-3 flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground">{c.description}</p>
                <p className="text-xs text-muted-foreground">{c.complaint_type} • {new Date(c.created_at).toLocaleDateString()}</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{c.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin: view all complaints
export const AdminComplaintsPanel = () => {
  const queryClient = useQueryClient();

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["admin-complaints"],
    queryFn: async () => {
      const { data } = await supabase
        .from("worker_complaints")
        .select("*")
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const userIds = [...new Set([...data.map(c => c.worker_id), ...data.map(c => c.requester_id)])];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(c => ({
        ...c,
        worker_name: profileMap.get(c.worker_id)?.name || "Unknown",
        requester_name: profileMap.get(c.requester_id)?.name || "Unknown",
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("worker_complaints").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint updated");
      queryClient.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
  });

  if (isLoading) return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h2 className="font-display font-bold text-lg text-foreground">Worker Complaints</h2>
      </div>
      {complaints?.length === 0 ? (
        <p className="text-sm text-muted-foreground">No complaints</p>
      ) : (
        <div className="space-y-2">
          {complaints?.map((c: any) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Against: {c.worker_name}</p>
                  <p className="text-xs text-muted-foreground">By: {c.requester_name} • {c.complaint_type}</p>
                  <p className="text-sm text-muted-foreground mt-1">{c.description}</p>
                </div>
                <Badge variant="secondary">{c.status}</Badge>
              </div>
              {c.status === "open" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: c.id, status: "resolved" })}>Resolve</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: c.id, status: "escalated" })}>Escalate</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
