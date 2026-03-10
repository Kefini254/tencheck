import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Home, CheckCircle, Clock, Star, Plus, X, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Landlord: Create and manage tenancies
export const LandlordTenancyManager = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tenantPhone, setTenantPhone] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [leaseStart, setLeaseStart] = useState("");
  const [leaseEnd, setLeaseEnd] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["landlord-props-for-tenancy", userId],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id, title").eq("landlord_id", userId);
      return data ?? [];
    },
  });

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ["landlord-tenancies", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancy_records")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const tenantIds = [...new Set(data.map(t => t.tenant_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, phone").in("user_id", tenantIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const propIds = [...new Set(data.filter(t => t.property_id).map(t => t.property_id!))];
      let propMap = new Map();
      if (propIds.length) {
        const { data: props } = await supabase.from("properties").select("id, title").in("id", propIds);
        propMap = new Map((props || []).map(p => [p.id, p]));
      }
      return data.map(t => ({ ...t, tenant: profileMap.get(t.tenant_id), property: propMap.get(t.property_id) }));
    },
  });

  const createTenancy = useMutation({
    mutationFn: async () => {
      const { data: tenant } = await supabase.from("profiles").select("user_id").eq("phone", tenantPhone).maybeSingle();
      if (!tenant) throw new Error("Tenant not found with that phone");
      const { error } = await supabase.from("tenancy_records").insert({
        tenant_id: tenant.user_id,
        landlord_id: userId,
        property_id: propertyId || null,
        monthly_rent: parseInt(monthlyRent),
        lease_start_date: leaseStart || null,
        lease_end_date: leaseEnd || null,
        tenancy_status: "active",
        verification_status: "landlord_verified",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tenancy created!");
      queryClient.invalidateQueries({ queryKey: ["landlord-tenancies"] });
      setShowForm(false);
      setTenantPhone(""); setMonthlyRent(""); setLeaseStart(""); setLeaseEnd("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColors: Record<string, string> = {
    active: "bg-primary/10 text-primary",
    pending_verification: "bg-yellow-500/10 text-yellow-600",
    completed: "bg-muted text-muted-foreground",
    terminated: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent">
            <Home className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Tenancy Records</h2>
            <p className="text-sm text-muted-foreground">Manage active and past tenancies</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "New Tenancy"}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Input placeholder="Tenant phone number" value={tenantPhone} onChange={e => setTenantPhone(e.target.value)} required />
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
                <option value="">Select property (optional)</option>
                {properties?.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <Input type="number" placeholder="Monthly rent (Ksh)" value={monthlyRent} onChange={e => setMonthlyRent(e.target.value)} required />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Lease start</Label><Input type="date" value={leaseStart} onChange={e => setLeaseStart(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Lease end</Label><Input type="date" value={leaseEnd} onChange={e => setLeaseEnd(e.target.value)} /></div>
              </div>
              <Button onClick={() => createTenancy.mutate()} disabled={createTenancy.isPending} className="w-full">
                {createTenancy.isPending ? "Creating..." : "Create Tenancy"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : tenancies?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tenancy records yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenancies?.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{t.tenant?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">
                  {t.property?.title || "No property"} • Ksh {t.monthly_rent?.toLocaleString()}/mo
                  {t.lease_start_date && ` • ${t.lease_start_date}`}
                </p>
              </div>
              <Badge className={statusColors[t.tenancy_status] || ""}>{t.tenancy_status?.replace("_", " ")}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tenant: View tenancies and leave reviews
export const TenantTenancyView = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [reviewTenancy, setReviewTenancy] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ["tenant-tenancies", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenancy_records")
        .select("*")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false });
      if (!data?.length) return [];
      const landlordIds = [...new Set(data.map(t => t.landlord_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", landlordIds);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      return data.map(t => ({ ...t, landlord: profileMap.get(t.landlord_id) }));
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["tenant-reviews-given", userId],
    queryFn: async () => {
      const { data } = await supabase.from("tenancy_reviews").select("tenancy_id").eq("reviewer_id", userId);
      return new Set((data || []).map(r => r.tenancy_id));
    },
  });

  const submitReview = useMutation({
    mutationFn: async (tenancyId: string) => {
      const tenancy = tenancies?.find(t => t.id === tenancyId);
      if (!tenancy) throw new Error("Tenancy not found");
      const { error } = await supabase.from("tenancy_reviews").insert({
        tenancy_id: tenancyId,
        reviewer_id: userId,
        reviewee_id: tenancy.landlord_id,
        review_type: "tenant_reviewing_landlord",
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted!");
      setReviewTenancy(null);
      setRating(5);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["tenant-reviews-given"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <Home className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">My Tenancies</h2>
          <p className="text-sm text-muted-foreground">Your rental history and reviews</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : tenancies?.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
          <Home className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tenancy records yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tenancies?.map((t: any) => {
            const hasReviewed = reviews?.has(t.id);
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Landlord: {t.landlord?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      Ksh {t.monthly_rent?.toLocaleString()}/mo
                      {t.lease_start_date && ` • ${t.lease_start_date} → ${t.lease_end_date || "ongoing"}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-[10px]">{t.tenancy_status?.replace("_", " ")}</Badge>
                    {!hasReviewed && t.tenancy_status !== "pending_verification" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setReviewTenancy(t.id)}>
                        <Star className="h-3 w-3 mr-1" /> Review
                      </Button>
                    )}
                    {hasReviewed && (
                      <Badge className="bg-primary/10 text-primary text-[10px]"><CheckCircle className="h-3 w-3 mr-1" /> Reviewed</Badge>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {reviewTenancy === t.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                      <div className="border-t border-border pt-3 mt-2 space-y-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <button key={s} onClick={() => setRating(s)}>
                              <Star className={`h-5 w-5 ${s <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                            </button>
                          ))}
                        </div>
                        <Textarea placeholder="Your review (optional)..." value={comment} onChange={e => setComment(e.target.value)} rows={2} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => submitReview.mutate(t.id)} disabled={submitReview.isPending}>Submit</Button>
                          <Button size="sm" variant="outline" onClick={() => setReviewTenancy(null)}>Cancel</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default { LandlordTenancyManager, TenantTenancyView };
