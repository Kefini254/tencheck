import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wifi, Wrench, Plus, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SERVICE_CATEGORIES = [
  "WiFi Installation",
  "Plumbing", "Electrical Repair", "House Cleaning", "Carpentry",
  "Interior Painting", "Pest Control", "General Handyman",
  "Relocation Assistance", "Furniture Moving",
];

export const ServiceRequestPanel = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("WiFi Installation");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["my-service-requests", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("*")
        .eq("requester_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_requests").insert({
        requester_id: userId,
        service_category: category,
        location,
        description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Service request submitted!");
      queryClient.invalidateQueries({ queryKey: ["my-service-requests"] });
      setShowForm(false);
      setLocation("");
      setDescription("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColor: Record<string, string> = {
    open: "bg-primary/10 text-primary",
    pending: "bg-yellow-500/10 text-yellow-600",
    in_progress: "bg-blue-500/10 text-blue-600",
    completed: "bg-primary/10 text-primary",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent">
            <Wifi className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">Service Requests</h3>
            <p className="text-sm text-muted-foreground">WiFi installation & property services</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {showForm ? "Cancel" : "New Request"}
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitRequest.mutate();
            }}
            className="rounded-xl border border-border bg-card p-4 space-y-3"
          >
            <div className="space-y-2">
              <Label>Service Category</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="Kilimani, Nairobi"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Describe what you need..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={submitRequest.isPending} className="w-full">
              {submitRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : requests?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <Wrench className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No service requests yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests?.map((req: any) => (
            <div
              key={req.id}
              className="rounded-xl border border-border bg-card p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {req.service_category === "WiFi Installation" ? (
                      <Wifi className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <p className="text-sm font-semibold text-foreground">{req.service_category}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {req.location}
                  </p>
                  {req.description && (
                    <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                  )}
                </div>
                <Badge className={`text-[10px] shrink-0 ${statusColor[req.status] || ""}`}>
                  {req.status?.replace("_", " ")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
