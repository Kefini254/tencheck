import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Shield, Search, Home, Upload, BarChart3, MessageSquare, Users,
  LogOut, Menu, X, FileText, AlertTriangle, Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type Tab = string;

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("");

  const role = profile?.role || "tenant";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (role === "landlord") setActiveTab("search-tenant");
    else if (role === "tenant") setActiveTab("browse-houses");
    else setActiveTab("search-tenant");
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="animate-pulse font-display text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <Shield className="h-5 w-5 text-primary" />
            TenCheck
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
        </div>

        <div className="p-3 border-b border-border">
          <p className="text-sm font-medium truncate">{profile?.name || "User"}</p>
          <p className="text-xs text-muted-foreground capitalize">{role}</p>
        </div>

        <nav className="p-3 space-y-1">
          {role === "landlord" && (
            <>
              <SidebarItem icon={Search} label="Search Tenant" active={activeTab === "search-tenant"} onClick={() => setActiveTab("search-tenant")} />
              <SidebarItem icon={FileText} label="Report Payment" active={activeTab === "report-payment"} onClick={() => setActiveTab("report-payment")} />
              <SidebarItem icon={Home} label="My Properties" active={activeTab === "my-properties"} onClick={() => setActiveTab("my-properties")} />
              <SidebarItem icon={MessageSquare} label="Inquiries" active={activeTab === "inquiries"} onClick={() => setActiveTab("inquiries")} />
            </>
          )}
          {role === "tenant" && (
            <>
              <SidebarItem icon={Home} label="Browse Houses" active={activeTab === "browse-houses"} onClick={() => setActiveTab("browse-houses")} />
              <SidebarItem icon={Upload} label="Upload Proof" active={activeTab === "upload-proof"} onClick={() => setActiveTab("upload-proof")} />
              <SidebarItem icon={BarChart3} label="My Score" active={activeTab === "my-score"} onClick={() => setActiveTab("my-score")} />
              <SidebarItem icon={MessageSquare} label="My Inquiries" active={activeTab === "my-inquiries"} onClick={() => setActiveTab("my-inquiries")} />
            </>
          )}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h1 className="font-display font-semibold text-lg capitalize">{role} Dashboard</h1>
        </header>

        <div className="p-6">
          {role === "landlord" && activeTab === "search-tenant" && <SearchTenantView />}
          {role === "landlord" && activeTab === "report-payment" && <ReportPaymentView userId={user.id} />}
          {role === "landlord" && activeTab === "my-properties" && <MyPropertiesView userId={user.id} />}
          {role === "landlord" && activeTab === "inquiries" && <LandlordInquiriesView userId={user.id} />}
          {role === "tenant" && activeTab === "browse-houses" && <BrowseHousesView />}
          {role === "tenant" && activeTab === "upload-proof" && <UploadProofView />}
          {role === "tenant" && activeTab === "my-score" && <MyScoreView userId={user.id} />}
          {role === "tenant" && activeTab === "my-inquiries" && <TenantInquiriesView userId={user.id} />}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const ScoreGauge = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "hsl(152, 60%, 36%)" : score >= 40 ? "hsl(45, 80%, 50%)" : "hsl(0, 72%, 51%)";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r="45" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="font-display text-2xl font-bold">{score}</span>
        <span className="block text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="glass-card rounded-xl p-5">
    <p className="text-sm text-muted-foreground mb-1">{label}</p>
    <p className="font-display text-2xl font-bold">{value}</p>
  </div>
);

// ===== Landlord Views =====

const SearchTenantView = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    
    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .or(`national_id.eq.${query},phone.eq.${query}`)
      .maybeSingle();

    if (tenant?.user_id) {
      const { data: score } = await supabase
        .from("tenant_scores")
        .select("*")
        .eq("tenant_id", tenant.user_id)
        .maybeSingle();

      setResult({ tenant, score });
    } else {
      setResult(null);
      toast.info("No tenant found with that ID or phone number.");
    }
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Search Tenant</h2>
        <div className="flex gap-3 max-w-md">
          <Input placeholder="National ID or phone number" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button className="gap-2" onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" /> {searching ? "..." : "Search"}
          </Button>
        </div>

        {result && (
          <div className="mt-6 p-6 border border-border rounded-xl flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={result.score?.score ?? 100} />
            <div>
              <h3 className="font-display font-semibold text-lg">{result.tenant.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                ID: {result.tenant.national_id} • {result.tenant.phone}
              </p>
              <div className="flex gap-4 text-sm">
                <span>Total: <strong>{result.score?.total_payments ?? 0}</strong></span>
                <span>Late: <strong>{result.score?.late_payments ?? 0}</strong></span>
                <span>Missed: <strong>{result.score?.missed_payments ?? 0}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ReportPaymentView = ({ userId }: { userId: string }) => {
  const [tenantPhone, setTenantPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("paid");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("user_id")
      .eq("phone", tenantPhone)
      .maybeSingle();

    if (!tenant) {
      toast.error("Tenant not found with that phone number");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("rental_records").insert({
      tenant_id: tenant.user_id!,
      landlord_id: userId,
      rent_amount: parseInt(amount),
      payment_status: status,
      payment_date: new Date().toISOString().split("T")[0],
    });

    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Payment reported successfully");
      setTenantPhone("");
      setAmount("");
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 max-w-md">
      <h2 className="font-display font-semibold text-lg mb-4">Report Tenant Payment</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Tenant Phone</Label>
          <Input placeholder="0712 345 678" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Amount (Ksh)</Label>
          <Input type="number" placeholder="12000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="paid">Paid On Time</option>
            <option value="late">Late</option>
            <option value="missed">Missed</option>
          </select>
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Reporting..." : "Report Payment"}
        </Button>
      </form>
    </div>
  );
};

const MyPropertiesView = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["my-properties", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createProperty = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("properties").insert({
        landlord_id: userId,
        title,
        description,
        location,
        rent_amount: parseInt(rent),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property listed!");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      setShowForm(false);
      setTitle(""); setDescription(""); setLocation(""); setRent("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-display font-semibold text-lg">My Properties</h2>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" /> Add Property
        </Button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-6">
          <form onSubmit={(e) => { e.preventDefault(); createProperty.mutate(); }} className="space-y-4 max-w-lg">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Modern 2BR Apartment" required /></div>
            <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kilimani, Nairobi" required /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the property..." /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Rent (Ksh)</Label><Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Bedrooms</Label><Input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} /></div>
              <div className="space-y-2"><Label>Bathrooms</Label><Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} /></div>
            </div>
            <Button type="submit" disabled={createProperty.isPending}>
              {createProperty.isPending ? "Listing..." : "List Property"}
            </Button>
          </form>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : properties?.length === 0 ? (
        <p className="text-muted-foreground text-sm">No properties listed yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties?.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-5">
              <h3 className="font-display font-semibold">{p.title}</h3>
              <p className="text-sm text-muted-foreground">{p.location}</p>
              <p className="font-display font-bold mt-2">Ksh {p.rent_amount.toLocaleString()}/mo</p>
              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                <span>{p.bedrooms} BR</span>
                <span>{p.bathrooms} BA</span>
                <span className={p.is_available ? "text-primary" : "text-destructive"}>{p.is_available ? "Available" : "Taken"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LandlordInquiriesView = ({ userId }: { userId: string }) => {
  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["landlord-inquiries", userId],
    queryFn: async () => {
      const { data: myProps } = await supabase
        .from("properties")
        .select("id, title")
        .eq("landlord_id", userId);
      if (!myProps?.length) return [];

      const propIds = myProps.map((p) => p.id);
      const { data } = await supabase
        .from("inquiries")
        .select("*, properties(title)")
        .in("property_id", propIds)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-lg">Inquiries</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
        inquiries?.length === 0 ? <p className="text-sm text-muted-foreground">No inquiries yet.</p> :
        inquiries?.map((inq: any) => (
          <div key={inq.id} className="glass-card rounded-xl p-5">
            <p className="text-sm font-medium">{inq.properties?.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{inq.message}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${inq.status === 'pending' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
              {inq.status}
            </span>
          </div>
        ))
      }
    </div>
  );
};

// ===== Tenant Views =====

const BrowseHousesView = () => {
  const { user } = useAuth();
  const [inquiryPropId, setInquiryPropId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const { data: properties, isLoading } = useQuery({
    queryKey: ["all-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("is_available", true).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const sendInquiry = async () => {
    if (!user || !inquiryPropId || !message.trim()) return;
    const { error } = await supabase.from("inquiries").insert({
      tenant_id: user.id,
      property_id: inquiryPropId,
      message,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Inquiry sent!");
      setInquiryPropId(null);
      setMessage("");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-lg">Available Properties</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
        properties?.length === 0 ? <p className="text-sm text-muted-foreground">No properties available.</p> :
        properties?.map((p) => (
          <div key={p.id} className="glass-card rounded-xl p-5">
            <h3 className="font-display font-semibold">{p.title}</h3>
            <p className="text-sm text-muted-foreground">{p.location}</p>
            <p className="font-display font-bold mt-1">Ksh {p.rent_amount.toLocaleString()}/mo</p>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1 mb-3">
              <span>{p.bedrooms} BR</span><span>{p.bathrooms} BA</span>
            </div>
            {p.description && <p className="text-sm text-muted-foreground mb-3">{p.description}</p>}

            {inquiryPropId === p.id ? (
              <div className="space-y-2">
                <Textarea placeholder="Write your message..." value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={sendInquiry}>Send</Button>
                  <Button size="sm" variant="ghost" onClick={() => setInquiryPropId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setInquiryPropId(p.id)}>
                <MessageSquare className="h-3 w-3 mr-1" /> Enquire
              </Button>
            )}
          </div>
        ))
      }
    </div>
  );
};

const UploadProofView = () => {
  const [smsText, setSmsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!smsText.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("parse-sms", {
      body: { sms_text: smsText },
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to parse SMS");
    } else {
      toast.success("Payment evidence submitted!");
      setResult(data.parsed);
      setSmsText("");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Upload M-Pesa Payment Proof</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Paste your M-Pesa confirmation SMS below. Our system will automatically extract payment details.
        </p>
        <Textarea
          placeholder="Confirmed. Ksh 12000 sent to John Kamau. Transaction ID QJK123ABC Date 7/3/2026"
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          rows={5}
          className="mb-4"
        />
        <Button onClick={handleUpload} disabled={submitting} className="gap-2">
          <Upload className="h-4 w-4" />
          {submitting ? "Parsing..." : "Submit Payment Proof"}
        </Button>
      </div>

      {result && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-display font-semibold mb-3">Parsed Results</h3>
          <div className="space-y-2 text-sm">
            <p>Amount: <strong>Ksh {result.amount?.toLocaleString() ?? "N/A"}</strong></p>
            <p>Transaction Code: <strong>{result.transaction_code ?? "N/A"}</strong></p>
            <p>Receiver: <strong>{result.receiver_name ?? "N/A"}</strong></p>
            <p>Date: <strong>{result.payment_date ?? "N/A"}</strong></p>
          </div>
        </div>
      )}
    </div>
  );
};

const MyScoreView = ({ userId }: { userId: string }) => {
  const { data: score, isLoading } = useQuery({
    queryKey: ["my-score", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_scores")
        .select("*")
        .eq("tenant_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: evidence } = useQuery({
    queryKey: ["my-evidence", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_evidence")
        .select("*")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6">
        <h2 className="font-display font-semibold text-lg mb-4">Your Reputation Score</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <ScoreGauge score={score?.score ?? 100} />
          <div className="space-y-2 text-sm">
            <p>Total Payments: <strong>{score?.total_payments ?? 0}</strong></p>
            <p>Late Payments: <strong>{score?.late_payments ?? 0}</strong></p>
            <p>Missed Payments: <strong>{score?.missed_payments ?? 0}</strong></p>
            <p>Verified SMS Payments: <strong>{score?.verified_sms_payments ?? 0}</strong></p>
          </div>
        </div>
      </div>

      {evidence && evidence.length > 0 && (
        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-display font-semibold mb-4">Payment Evidence History</h3>
          <div className="space-y-3">
            {evidence.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Ksh {e.amount?.toLocaleString() ?? "—"} → {e.receiver_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{e.transaction_code} • {e.payment_date ?? "—"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${e.verification_status === 'verified' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {e.verification_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TenantInquiriesView = ({ userId }: { userId: string }) => {
  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["tenant-inquiries", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inquiries")
        .select("*, properties(title, location)")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-lg">My Inquiries</h2>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading...</p> :
        inquiries?.length === 0 ? <p className="text-sm text-muted-foreground">No inquiries yet.</p> :
        inquiries?.map((inq: any) => (
          <div key={inq.id} className="glass-card rounded-xl p-5">
            <p className="text-sm font-medium">{inq.properties?.title} — {inq.properties?.location}</p>
            <p className="text-sm text-muted-foreground mt-1">{inq.message}</p>
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${inq.status === 'pending' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
              {inq.status}
            </span>
          </div>
        ))
      }
    </div>
  );
};

export default Dashboard;
