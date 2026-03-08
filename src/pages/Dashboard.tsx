import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, Search, Home, Upload, BarChart3, MessageSquare, Users,
  LogOut, Menu, X, FileText, AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

type Role = "landlord" | "tenant" | "admin";

const Dashboard = () => {
  const [role, setRole] = useState<Role>("landlord");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        {/* Demo role switcher */}
        <div className="p-3 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">Demo: Switch role</p>
          <div className="flex gap-1">
            {(["landlord", "tenant", "admin"] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all capitalize ${role === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {role === "landlord" && (
            <>
              <SidebarItem icon={Search} label="Search Tenant" active />
              <SidebarItem icon={FileText} label="Report Payment" />
              <SidebarItem icon={Home} label="My Properties" />
              <SidebarItem icon={MessageSquare} label="Inquiries" />
              <SidebarItem icon={BarChart3} label="Tenant Reports" />
            </>
          )}
          {role === "tenant" && (
            <>
              <SidebarItem icon={Home} label="Browse Houses" active />
              <SidebarItem icon={Upload} label="Upload Proof" />
              <SidebarItem icon={BarChart3} label="My Score" />
              <SidebarItem icon={MessageSquare} label="My Inquiries" />
            </>
          )}
          {role === "admin" && (
            <>
              <SidebarItem icon={Users} label="Users" active />
              <SidebarItem icon={AlertTriangle} label="Disputes" />
              <SidebarItem icon={Shield} label="Verify Landlords" />
              <SidebarItem icon={Home} label="Moderate Listings" />
            </>
          )}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" asChild>
            <Link to="/"><LogOut className="h-4 w-4" /> Sign Out</Link>
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="h-5 w-5" /></button>
          <h1 className="font-display font-semibold text-lg capitalize">{role} Dashboard</h1>
        </header>

        <div className="p-6">
          {role === "landlord" && <LandlordView />}
          {role === "tenant" && <TenantView />}
          {role === "admin" && <AdminView />}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) => (
  <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>
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

const LandlordView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Properties Listed" value="4" />
      <StatCard label="Tenant Searches" value="23" />
      <StatCard label="Active Inquiries" value="7" />
    </div>
    <div className="glass-card rounded-2xl p-6">
      <h2 className="font-display font-semibold text-lg mb-4">Search Tenant</h2>
      <div className="flex gap-3 max-w-md">
        <Input placeholder="National ID or phone number" />
        <Button className="gap-2"><Search className="h-4 w-4" /> Search</Button>
      </div>
      <div className="mt-6 p-6 border border-border rounded-xl flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={78} />
        <div>
          <h3 className="font-display font-semibold text-lg">Jane Wanjiku</h3>
          <p className="text-sm text-muted-foreground mb-2">ID: 12345678 • 0712 345 678</p>
          <div className="flex gap-4 text-sm">
            <span>Total Payments: <strong>24</strong></span>
            <span>Late: <strong>3</strong></span>
            <span>Missed: <strong>1</strong></span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TenantView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Your Score" value="85" />
      <StatCard label="Verified Payments" value="18" />
      <StatCard label="Inquiries Sent" value="3" />
    </div>
    <div className="glass-card rounded-2xl p-6">
      <h2 className="font-display font-semibold text-lg mb-4">Your Reputation Score</h2>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={85} />
        <div className="space-y-2 text-sm">
          <p>Total Payments: <strong>20</strong></p>
          <p>Late Payments: <strong>2</strong></p>
          <p>Missed Payments: <strong>0</strong></p>
          <p>Verified SMS Payments: <strong>18</strong></p>
          <Button className="mt-3 gap-2"><Upload className="h-4 w-4" /> Upload Payment Proof</Button>
        </div>
      </div>
    </div>
  </div>
);

const AdminView = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard label="Total Users" value="1,247" />
      <StatCard label="Properties" value="342" />
      <StatCard label="Pending Disputes" value="5" />
      <StatCard label="Unverified Landlords" value="12" />
    </div>
    <div className="glass-card rounded-2xl p-6">
      <h2 className="font-display font-semibold text-lg mb-4">Recent Activity</h2>
      <p className="text-muted-foreground text-sm">Admin management panel — connect to Lovable Cloud to enable full functionality.</p>
    </div>
  </div>
);

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="glass-card rounded-xl p-5">
    <p className="text-sm text-muted-foreground mb-1">{label}</p>
    <p className="font-display text-2xl font-bold">{value}</p>
  </div>
);

export default Dashboard;
