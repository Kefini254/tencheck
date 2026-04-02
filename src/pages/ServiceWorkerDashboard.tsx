import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield, LogOut, Menu, X, ChevronRight, Wrench, Briefcase,
  Clock, History, Settings, Star, MapPin, Phone, Upload,
  CheckCircle, XCircle, User, Eye, EyeOff, Wifi,
  MessageSquare, Bell, AlertTriangle, ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import tenCheckLogo from "@/assets/tencheck-logo.png";
import { MessagingHub } from "@/components/dashboard/MessagingHub";
import { NotificationsPanel, NotificationBell } from "@/components/dashboard/NotificationsPanel";

const SERVICE_CATEGORIES = [
  "Plumbing", "Electrical Repair", "House Cleaning", "Furniture Moving",
  "Interior Painting", "Exterior Painting", "Pest Control", "Carpentry",
  "WiFi Installation", "General Handyman", "Landscaping", "Relocation Assistance",
];

type Tab = "overview" | "incoming" | "active" | "history" | "messages" | "notifications" | "settings";

const ServiceWorkerDashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  // Fetch or create worker profile
  const { data: workerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["worker-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("service_worker_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription for service_requests changes
  useEffect(() => {
    const channel = supabase
      .channel("service-requests-realtime")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "service_requests",
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["incoming-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["active-jobs"] });
        queryClient.invalidateQueries({ queryKey: ["job-history"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-create profile if missing
  const createProfile = useMutation({
    mutationFn: async (category: string) => {
      const { error } = await supabase.from("service_worker_profiles").insert({
        user_id: user!.id,
        service_category: category,
        city: "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-profile"] });
      toast.success("Profile created!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  // Onboarding: pick category
  if (!workerProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <img src={tenCheckLogo} alt="TenCheck" className="h-10 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground">Set Up Your Worker Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose your primary service category</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SERVICE_CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant="outline"
                className="h-auto py-4 flex-col gap-1"
                onClick={() => createProfile.mutate(cat)}
                disabled={createProfile.isPending}
              >
                <Wrench className="h-5 w-5 text-primary" />
                <span className="text-xs">{cat}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const tabGroups = [
    {
      label: "Profile",
      tabs: [
        { id: "overview" as Tab, icon: User, label: "Profile Overview" },
        { id: "settings" as Tab, icon: Settings, label: "Profile Settings" },
      ],
    },
    {
      label: "Jobs",
      tabs: [
        { id: "incoming" as Tab, icon: Briefcase, label: "Incoming Jobs" },
        { id: "active" as Tab, icon: Clock, label: "Active Jobs" },
        { id: "history" as Tab, icon: History, label: "Job History" },
      ],
    },
    {
      label: "Communication",
      tabs: [
        { id: "messages" as Tab, icon: MessageSquare, label: "Messages" },
        { id: "notifications" as Tab, icon: Bell, label: "Notifications" },
      ],
    },
  ];
  const allTabs = tabGroups.flatMap((g) => g.tabs);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <img src={tenCheckLogo} alt="TenCheck" className="h-8" />
          </Link>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
              <span className="font-display font-bold text-sm text-accent-foreground">
                {(profile?.name || "W").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{profile?.name || "Worker"}</p>
              <Badge variant="secondary" className="text-[10px] capitalize mt-0.5">
                {workerProfile.service_category}
              </Badge>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">Menu</p>
          {tabs.map((tab) => (
            <SidebarItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
            />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border shrink-0">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center px-4 sm:px-6 gap-4 shrink-0">
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display font-bold text-lg text-foreground">
            {tabs.find((t) => t.id === activeTab)?.label || "Dashboard"}
          </h1>
          <div className="ml-auto">
            <NotificationBell userId={user.id} onClick={() => setActiveTab("notifications")} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {activeTab === "overview" && <ProfileOverview profile={workerProfile} />}
                {activeTab === "messages" && <MessagingHub userId={user.id} userRole="service_worker" />}
                {activeTab === "notifications" && <NotificationsPanel userId={user.id} />}
                {activeTab === "incoming" && <IncomingJobs userId={user.id} workerProfile={workerProfile} />}
                {activeTab === "active" && <ActiveJobs userId={user.id} />}
                {activeTab === "history" && <JobHistory userId={user.id} />}
                {activeTab === "settings" && <ProfileSettings userId={user.id} workerProfile={workerProfile} onSaved={() => setActiveTab("overview")} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{label}</span>
    {active && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-60" />}
  </button>
);

// ===== Profile Overview =====
const ProfileOverview = ({ profile }: { profile: any }) => {
  const verificationColor: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    verified: "bg-primary/10 text-primary",
    suspended: "bg-destructive/10 text-destructive",
  };
  const visibilityIcon = profile.visibility_status === "public" ? Eye : EyeOff;
  const VisIcon = visibilityIcon;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Service Category" value={profile.service_category} icon={Wrench} />
        <StatCard label="Experience" value={`${profile.years_experience || 0} years`} icon={Briefcase} />
        <StatCard label="Rating" value={Number(profile.rating_score || 0).toFixed(1)} icon={Star} />
        <StatCard label="Jobs Completed" value={String(profile.jobs_completed || 0)} icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Verification</p>
          <Badge className={`${verificationColor[profile.verification_status] || ""}`}>
            {profile.verification_status}
          </Badge>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Visibility</p>
          <div className="flex items-center gap-2">
            <VisIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium capitalize text-foreground">{profile.visibility_status}</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Availability</p>
          <Badge variant={profile.availability_status === "available" ? "default" : "secondary"}>
            {profile.availability_status}
          </Badge>
        </div>
      </div>

      {profile.verification_status === "pending" && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <p className="text-sm font-medium text-yellow-700">⚠️ Your profile is pending verification</p>
          <p className="text-xs text-muted-foreground mt-1">Complete your Profile Settings to get automatically verified.</p>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: any }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
    <p className="font-display font-bold text-lg text-foreground">{value}</p>
  </div>
);

// ===== Incoming Jobs =====
const IncomingJobs = ({ userId, workerProfile }: { userId: string; workerProfile: any }) => {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["incoming-jobs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("*")
        .eq("service_category", workerProfile.service_category)
        .eq("status", "open")
        .is("worker_id", null)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const acceptJob = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from("service_requests")
        .update({ worker_id: userId, status: "accepted" })
        .eq("id", jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job accepted! The requester has been notified.");
      queryClient.invalidateQueries({ queryKey: ["incoming-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["active-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{jobs?.length || 0} open requests in your category</p>
      {jobs?.length === 0 ? (
        <EmptyState icon={Briefcase} message="No incoming job requests right now" />
      ) : (
        <div className="space-y-3">
          {jobs?.map((job: any) => (
            <motion.div
              key={job.id}
              layout
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, x: -100 }}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{job.service_category}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</p>
                  {job.description && <p className="text-xs text-muted-foreground">{job.description}</p>}
                  {job.scheduled_date && <p className="text-xs text-muted-foreground">Scheduled: {job.scheduled_date}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => acceptJob.mutate(job.id)} disabled={acceptJob.isPending || workerProfile.verification_status === "suspended"}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== Active Jobs =====
const ActiveJobs = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["active-jobs", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("*")
        .eq("worker_id", userId)
        .in("status", ["accepted", "in_progress"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "completed") {
        const { data: wp } = await supabase
          .from("service_worker_profiles")
          .select("jobs_completed")
          .eq("user_id", userId)
          .single();
        if (wp) {
          await supabase
            .from("service_worker_profiles")
            .update({ jobs_completed: (wp.jobs_completed || 0) + 1 })
            .eq("user_id", userId);
        }
      }
      const { error } = await supabase.from("service_requests").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job updated!");
      queryClient.invalidateQueries({ queryKey: ["active-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job-history"] });
      queryClient.invalidateQueries({ queryKey: ["worker-profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      {jobs?.length === 0 ? (
        <EmptyState icon={Clock} message="No active jobs" />
      ) : (
        <div className="space-y-3">
          {jobs?.map((job: any) => (
            <div key={job.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{job.service_category}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</p>
                  {job.description && <p className="text-xs text-muted-foreground">{job.description}</p>}
                  <Badge variant="secondary" className="text-[10px]">{job.status}</Badge>
                </div>
                <div className="flex gap-2 shrink-0">
                  {job.status === "accepted" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: job.id, status: "in_progress" })}>
                      Start
                    </Button>
                  )}
                  {(job.status === "accepted" || job.status === "in_progress") && (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: job.id, status: "completed" })}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Complete
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

// ===== Job History =====
const JobHistory = ({ userId }: { userId: string }) => {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ["job-history", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_requests")
        .select("*")
        .eq("worker_id", userId)
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["worker-reviews", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("worker_reviews")
        .select("*")
        .eq("worker_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display font-bold text-foreground mb-3">Completed Jobs</h3>
        {jobs?.length === 0 ? (
          <EmptyState icon={History} message="No completed jobs yet" />
        ) : (
          <div className="space-y-2">
            {jobs?.map((job: any) => (
              <div key={job.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{job.service_category}</p>
                  <p className="text-xs text-muted-foreground">{job.location} • {new Date(job.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={job.status === "completed" ? "default" : "secondary"} className="text-[10px]">
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviews && reviews.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-foreground mb-3">Reviews</h3>
          <div className="space-y-2">
            {reviews.map((review: any) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                {review.review_text && <p className="text-xs text-muted-foreground">{review.review_text}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== Profile Settings =====
const ProfileSettings = ({ userId, workerProfile, onSaved }: { userId: string; workerProfile: any; onSaved: () => void }) => {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState(workerProfile.service_category);
  const [description, setDescription] = useState(workerProfile.description || "");
  const [city, setCity] = useState(workerProfile.city || "");
  const [experience, setExperience] = useState(String(workerProfile.years_experience || 0));
  const [availability, setAvailability] = useState(workerProfile.availability_status);
  const [uploading, setUploading] = useState(false);

  const updateProfile = useMutation({
    mutationFn: async () => {
      // Determine if we should auto-verify: profile has description, city, experience, and document
      const hasDocument = !!workerProfile.identity_document_url;
      const hasCity = !!city.trim();
      const hasDescription = !!description.trim();
      const shouldVerify = hasDocument && hasCity && hasDescription;

      const updateData: any = {
        service_category: category,
        description: description || null,
        city,
        years_experience: parseInt(experience) || 0,
        availability_status: availability,
      };

      // Auto-verify if all requirements met and currently pending
      if (shouldVerify && workerProfile.verification_status === "pending") {
        updateData.verification_status = "verified";
      }

      const { error } = await supabase
        .from("service_worker_profiles")
        .update(updateData)
        .eq("user_id", userId);
      if (error) throw error;

      return shouldVerify && workerProfile.verification_status === "pending";
    },
    onSuccess: (wasVerified) => {
      queryClient.invalidateQueries({ queryKey: ["worker-profile"] });
      if (wasVerified) {
        toast.success("Profile saved & verified! Your profile is now visible in the marketplace.");
      } else {
        toast.success("Profile updated successfully!");
      }
      // Navigate back to overview after saving
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const filePath = `${userId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("worker-documents")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("worker-documents").getPublicUrl(filePath);

    await supabase
      .from("service_worker_profiles")
      .update({ identity_document_url: urlData.publicUrl })
      .eq("user_id", userId);

    toast.success("Document uploaded!");
    queryClient.invalidateQueries({ queryKey: ["worker-profile"] });
    setUploading(false);
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display font-bold text-foreground">Edit Profile</h3>

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
          <Label>Description</Label>
          <Textarea placeholder="Describe your services..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label>City / Area</Label>
          <Input placeholder="Kilimani, Nairobi" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Years of Experience</Label>
          <Input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} min="0" />
        </div>

        <div className="space-y-2">
          <Label>Availability</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="w-full">
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Identity Document Upload */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-display font-bold text-foreground">Identity Verification</h3>
        <p className="text-sm text-muted-foreground">Upload a government-issued ID. Once uploaded and profile is complete, you'll be automatically verified.</p>

        {workerProfile.identity_document_url ? (
          <div className="flex items-center gap-2 text-sm text-primary">
            <CheckCircle className="h-4 w-4" />
            <span>Document uploaded</span>
          </div>
        ) : (
          <div>
            <Label htmlFor="doc-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" />
              <span className="text-sm">{uploading ? "Uploading..." : "Upload ID Document"}</span>
            </Label>
            <input id="doc-upload" type="file" className="hidden" accept="image/*,.pdf" onChange={handleDocUpload} disabled={uploading} />
          </div>
        )}
      </div>
    </div>
  );
};

// Shared components
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
  </div>
);

const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
  <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

export default ServiceWorkerDashboard;
