import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Shield, BarChart3, Users, Wrench, Bell, FileText, Eye, EyeOff,
  Ban, Trash2, AlertTriangle, CheckCircle, Search, Activity, FileCheck,
} from "lucide-react";

type Tab = "overview" | "workers" | "users" | "content" | "alerts" | "log" | "verification";

const tabItems: { id: Tab; icon: any; label: string }[] = [
  { id: "overview", icon: BarChart3, label: "Overview" },
  { id: "workers", icon: Wrench, label: "Workers" },
  { id: "users", icon: Users, label: "Users" },
  { id: "verification", icon: FileCheck, label: "Verification" },
  { id: "content", icon: FileText, label: "Content" },
  { id: "alerts", icon: Bell, label: "Alerts" },
  { id: "log", icon: Activity, label: "Activity Log" },
];

const ConfirmAction = ({ trigger, title, description, onConfirm }: {
  trigger: React.ReactNode; title: string; description: string; onConfirm: () => void;
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const { data: isAdmin, isLoading: roleLoading } = useQuery({
    queryKey: ["admin-role-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return !!data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("admin-alerts-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_alerts" }, () => {
        qc.invalidateQueries({ queryKey: ["admin-alerts"] });
        toast.info("New admin alert received");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, qc]);

  // ── QUERIES ──
  const { data: metrics } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async () => {
      const [t, l, w, vw, p, j, cj, tx] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "tenant"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "landlord"),
        supabase.from("service_worker_profiles").select("id", { count: "exact", head: true }),
        supabase.from("service_worker_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("is_available", true),
        supabase.from("service_requests").select("id", { count: "exact", head: true }),
        supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("rent_transactions").select("id, amount"),
      ]);
      const txData = tx.data || [];
      return {
        tenants: t.count ?? 0, landlords: l.count ?? 0, workers: w.count ?? 0,
        verifiedWorkers: vw.count ?? 0, properties: p.count ?? 0, jobs: j.count ?? 0,
        completedJobs: cj.count ?? 0, transactions: txData.length,
        volume: txData.reduce((s: number, r: any) => s + (r.amount || 0), 0),
      };
    },
    enabled: isAdmin === true,
  });

  const { data: workers } = useQuery({
    queryKey: ["admin-all-workers"],
    queryFn: async () => {
      const { data: wp } = await supabase.from("service_worker_profiles").select("*").order("created_at", { ascending: false });
      if (!wp?.length) return [];
      const uids = wp.map((w: any) => w.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", uids);
      const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const { data: complaints } = await supabase.from("worker_complaints").select("worker_id");
      const cc = new Map<string, number>();
      (complaints || []).forEach((c: any) => cc.set(c.worker_id, (cc.get(c.worker_id) || 0) + 1));
      return wp.map((w: any) => ({ ...w, profile: pm.get(w.user_id), complaintCount: cc.get(w.user_id) || 0 }));
    },
    enabled: isAdmin === true && tab === "workers",
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true && tab === "users",
  });

  const { data: allProperties } = useQuery({
    queryKey: ["admin-all-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true && tab === "content",
  });

  const { data: allComplaints } = useQuery({
    queryKey: ["admin-all-complaints"],
    queryFn: async () => {
      const { data } = await supabase.from("worker_complaints").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: isAdmin === true && tab === "content",
  });

  const { data: alerts } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("admin_alerts").select("*").order("created_at", { ascending: false }).limit(100);
      return (data || []) as any[];
    },
    enabled: isAdmin === true,
  });

  const { data: modLog } = useQuery({
    queryKey: ["admin-mod-log"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("moderation_log").select("*").order("created_at", { ascending: false }).limit(100);
      return (data || []) as any[];
    },
    enabled: isAdmin === true && tab === "log",
  });

  const { data: verificationQueue } = useQuery({
    queryKey: ["admin-verification-queue"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("landlord_verification").select("*").order("created_at", { ascending: false });
      if (!data?.length) return [];
      const landlordIds = data.map((v: any) => v.landlord_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, email").in("user_id", landlordIds);
      const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((v: any) => ({ ...v, profile: pm.get(v.landlord_id) }));
    },
    enabled: isAdmin === true && tab === "verification",
  });

  const unreadAlerts = alerts?.filter((a: any) => a.status === "unread").length ?? 0;

  // ── MUTATIONS ──
  const logAction = async (action: string, targetId: string, targetType: string, reason: string) => {
    await (supabase as any).from("moderation_log").insert({
      admin_id: user!.id, action, target_id: targetId, target_type: targetType, reason,
    });
  };

  const suspendWorkerMut = useMutation({
    mutationFn: async (workerId: string) => {
      await supabase.from("service_worker_profiles").update({ verification_status: "suspended" }).eq("user_id", workerId);
      await logAction("suspend_worker", workerId, "service_worker_profile", "Admin suspended worker");
    },
    onSuccess: () => { toast.success("Worker suspended"); qc.invalidateQueries({ queryKey: ["admin-all-workers"] }); },
  });

  const reduceVisibilityMut = useMutation({
    mutationFn: async (workerId: string) => {
      await supabase.from("service_worker_profiles").update({ visibility_status: "limited" }).eq("user_id", workerId);
      await logAction("reduce_visibility", workerId, "service_worker_profile", "Admin reduced visibility");
    },
    onSuccess: () => { toast.success("Visibility reduced"); qc.invalidateQueries({ queryKey: ["admin-all-workers"] }); },
  });

  const suspendUserMut = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("profiles").update({ is_suspended: true } as any).eq("user_id", userId);
      await logAction("suspend_user", userId, "profile", "Admin suspended user");
    },
    onSuccess: () => { toast.success("User suspended"); qc.invalidateQueries({ queryKey: ["admin-all-users"] }); },
  });

  const unsuspendUserMut = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("profiles").update({ is_suspended: false } as any).eq("user_id", userId);
      await logAction("unsuspend_user", userId, "profile", "Admin unsuspended user");
    },
    onSuccess: () => { toast.success("User unsuspended"); qc.invalidateQueries({ queryKey: ["admin-all-users"] }); },
  });

  const deleteUserMut = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("profiles").update({ deletion_status: "deleted", is_suspended: true } as any).eq("user_id", userId);
      await logAction("delete_user", userId, "profile", "Admin permanently deleted user");
    },
    onSuccess: () => { toast.success("User marked as deleted"); qc.invalidateQueries({ queryKey: ["admin-all-users"] }); },
  });

  const removePropertyMut = useMutation({
    mutationFn: async (propId: string) => {
      await supabase.from("properties").delete().eq("id", propId);
      await logAction("remove_property", propId, "property", "Admin removed property listing");
    },
    onSuccess: () => { toast.success("Property removed"); qc.invalidateQueries({ queryKey: ["admin-all-properties"] }); },
  });

  const markAlertReadMut = useMutation({
    mutationFn: async (alertId: string) => {
      await (supabase as any).from("admin_alerts").update({ status: "read" }).eq("id", alertId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-alerts"] }),
  });

  const markAllAlertsReadMut = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("admin_alerts").update({ status: "read" }).eq("status", "unread");
    },
    onSuccess: () => { toast.success("All alerts marked as read"); qc.invalidateQueries({ queryKey: ["admin-alerts"] }); },
  });

  const verifyLandlordMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await (supabase as any).from("landlord_verification").update({
        verification_status: status,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      await logAction(`landlord_verification_${status}`, id, "landlord_verification", `Admin ${status} landlord verification`);
    },
    onSuccess: () => { toast.success("Verification updated"); qc.invalidateQueries({ queryKey: ["admin-verification-queue"] }); },
  });

  // ── GUARDS ──
  if (loading || roleLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin === false) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-2">
        <Shield className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground text-sm">You do not have admin privileges.</p>
      </div>
    </div>
  );

  const filteredWorkers = workers?.filter((w: any) =>
    !search || w.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.service_category?.toLowerCase().includes(search.toLowerCase()) ||
    w.city?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const filteredUsers = allUsers?.filter((u: any) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-xl font-bold">TenCheck Admin</h1>
          </div>
          <button onClick={() => setTab("alerts")} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-5 w-5" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadAlerts}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex gap-1 flex-wrap mb-6">
          {tabItems.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}>
                <Icon className="h-4 w-4" />
                {t.label}
                {t.id === "alerts" && unreadAlerts > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{unreadAlerts}</Badge>
                )}
                {t.id === "verification" && verificationQueue?.filter((v: any) => v.verification_status === "pending").length > 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px] px-1.5 py-0">
                    {verificationQueue.filter((v: any) => v.verification_status === "pending").length}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Platform Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Tenants", value: metrics?.tenants ?? 0 },
                { label: "Total Landlords", value: metrics?.landlords ?? 0 },
                { label: "Service Workers", value: metrics?.workers ?? 0 },
                { label: "Verified Workers", value: metrics?.verifiedWorkers ?? 0 },
                { label: "Active Properties", value: metrics?.properties ?? 0 },
                { label: "Total Service Jobs", value: metrics?.jobs ?? 0 },
                { label: "Completed Jobs", value: metrics?.completedJobs ?? 0 },
                { label: "Rent Transactions", value: metrics?.transactions ?? 0 },
                { label: "Payment Volume", value: `KES ${(metrics?.volume ?? 0).toLocaleString()}` },
                { label: "Unread Alerts", value: unreadAlerts },
              ].map(m => (
                <div key={m.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-2xl font-display font-bold mt-1">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WORKERS ── */}
        {tab === "workers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" /> Worker Monitoring
              </h2>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search workers..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Jobs</TableHead>
                    <TableHead>Complaints</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.profile?.name || "Unknown"}</TableCell>
                      <TableCell>{w.service_category}</TableCell>
                      <TableCell>
                        <Badge className={w.verification_status === "verified" ? "bg-primary/10 text-primary" : w.verification_status === "suspended" ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600"}>
                          {w.verification_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(w.rating_score || 0).toFixed(1)}</TableCell>
                      <TableCell>{w.jobs_completed || 0}</TableCell>
                      <TableCell>
                        <span className={w.complaintCount >= 3 ? "text-destructive font-bold" : ""}>{w.complaintCount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {w.visibility_status === "public" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {w.visibility_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {w.visibility_status === "public" && (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="outline"><EyeOff className="h-3 w-3 mr-1" />Limit</Button>}
                              title="Reduce Visibility"
                              description={`Reduce visibility of ${w.profile?.name || "this worker"} to "limited"?`}
                              onConfirm={() => reduceVisibilityMut.mutate(w.user_id)}
                            />
                          )}
                          {w.verification_status !== "suspended" && (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="destructive"><Ban className="h-3 w-3 mr-1" />Suspend</Button>}
                              title="Suspend Worker"
                              description={`Suspend ${w.profile?.name || "this worker"}? Their profile will be hidden.`}
                              onConfirm={() => suspendWorkerMut.mutate(w.user_id)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredWorkers.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No workers found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> User Moderation
              </h2>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Deletion</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name || "—"}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                      <TableCell>
                        {u.is_suspended
                          ? <Badge variant="destructive">Suspended</Badge>
                          : <Badge className="bg-primary/10 text-primary">Active</Badge>}
                      </TableCell>
                      <TableCell>
                        {u.deletion_status === "pending_deletion" ? (
                          <Badge className="bg-yellow-500/10 text-yellow-600">Pending Delete</Badge>
                        ) : u.deletion_status === "deleted" ? (
                          <Badge variant="destructive">Deleted</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.is_suspended ? (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="outline"><CheckCircle className="h-3 w-3 mr-1" />Unsuspend</Button>}
                              title="Unsuspend User"
                              description={`Restore access for ${u.name || u.email}?`}
                              onConfirm={() => unsuspendUserMut.mutate(u.user_id)}
                            />
                          ) : (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="outline"><Ban className="h-3 w-3 mr-1" />Suspend</Button>}
                              title="Suspend User"
                              description={`Suspend ${u.name || u.email}? They will lose platform access.`}
                              onConfirm={() => suspendUserMut.mutate(u.user_id)}
                            />
                          )}
                          {u.deletion_status !== "deleted" && (
                            <ConfirmAction
                              trigger={<Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Delete</Button>}
                              title="Permanently Delete User"
                              description={`Permanently delete ${u.name || u.email}? This action will be logged and cannot be undone.`}
                              onConfirm={() => deleteUserMut.mutate(u.user_id)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── LANDLORD VERIFICATION ── */}
        {tab === "verification" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" /> Landlord Verification Queue
            </h2>
            <div className="space-y-3">
              {verificationQueue?.map((v: any) => (
                <div key={v.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{v.profile?.name || "Unknown Landlord"}</p>
                    <p className="text-xs text-muted-foreground">{v.profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs capitalize">{v.document_type.replace(/_/g, " ")}</Badge>
                      <Badge className={
                        v.verification_status === "verified" ? "bg-primary/10 text-primary" :
                        v.verification_status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-yellow-500/10 text-yellow-600"
                      }>{v.verification_status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(v.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.document_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={v.document_url} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-3 w-3 mr-1" /> View
                        </a>
                      </Button>
                    )}
                    {v.verification_status === "pending" && (
                      <>
                        <ConfirmAction
                          trigger={<Button size="sm" className="bg-primary text-primary-foreground"><CheckCircle className="h-3 w-3 mr-1" />Verify</Button>}
                          title="Verify Landlord"
                          description={`Verify ${v.profile?.name || "this landlord"}? They will receive a Verified badge.`}
                          onConfirm={() => verifyLandlordMut.mutate({ id: v.id, status: "verified" })}
                        />
                        <ConfirmAction
                          trigger={<Button size="sm" variant="destructive"><Ban className="h-3 w-3 mr-1" />Reject</Button>}
                          title="Reject Verification"
                          description={`Reject verification for ${v.profile?.name || "this landlord"}?`}
                          onConfirm={() => verifyLandlordMut.mutate({ id: v.id, status: "rejected" })}
                        />
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!verificationQueue?.length && (
                <p className="text-sm text-muted-foreground text-center py-8">No verification requests.</p>
              )}
            </div>
          </div>
        )}

        {/* ── CONTENT MODERATION ── */}
        {tab === "content" && (
          <div className="space-y-6">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Content Moderation
            </h2>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Property Listings ({allProperties?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {allProperties?.slice(0, 30).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="font-medium text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.location} · KES {p.rent_amount?.toLocaleString()}/mo</p>
                    </div>
                    <ConfirmAction
                      trigger={<Button size="sm" variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Remove</Button>}
                      title="Remove Property Listing"
                      description={`Remove "${p.title}"? This action will be logged.`}
                      onConfirm={() => removePropertyMut.mutate(p.id)}
                    />
                  </div>
                ))}
                {!allProperties?.length && <p className="text-sm text-muted-foreground">No properties listed.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                Worker Complaints ({allComplaints?.length ?? 0})
              </h3>
              <div className="space-y-2">
                {allComplaints?.map((c: any) => (
                  <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{c.complaint_type}</Badge>
                      <Badge className={c.status === "open" ? "bg-yellow-500/10 text-yellow-600" : "bg-primary/10 text-primary"}>{c.status}</Badge>
                    </div>
                    <p className="text-sm">{c.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
                {!allComplaints?.length && <p className="text-sm text-muted-foreground">No complaints filed.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ALERTS ── */}
        {tab === "alerts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Admin Alerts
              </h2>
              {unreadAlerts > 0 && (
                <Button size="sm" variant="outline" onClick={() => markAllAlertsReadMut.mutate()}>
                  Mark all as read
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {alerts?.map((a: any) => (
                <div key={a.id} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
                  a.status === "unread" ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                }`}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                      a.alert_type.includes("suspend") ? "text-destructive" :
                      a.alert_type === "large_payment" ? "text-yellow-500" : "text-primary"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {a.alert_type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {a.status === "unread" && (
                    <Button size="sm" variant="ghost" className="shrink-0 text-xs" onClick={() => markAlertReadMut.mutate(a.id)}>
                      Mark read
                    </Button>
                  )}
                </div>
              ))}
              {!alerts?.length && <p className="text-sm text-muted-foreground text-center py-8">No alerts yet.</p>}
            </div>
          </div>
        )}

        {/* ── ACTIVITY LOG ── */}
        {tab === "log" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" /> Moderation Activity Log
            </h2>
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modLog?.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.action.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge variant="outline">{l.target_type}</Badge></TableCell>
                      <TableCell className="text-sm">{l.reason}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!modLog?.length && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No moderation actions recorded</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
