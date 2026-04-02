import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Fetch profile and check suspension/role
    const { supabase: sb } = await import("@/integrations/supabase/client");
    const uid = (await sb.auth.getUser()).data.user?.id || "";
    const { data: prof } = await sb.from("profiles").select("*").eq("user_id", uid).maybeSingle();
    
    if ((prof as any)?.is_suspended) {
      toast.error("Your account has been suspended. Contact support.");
      await sb.auth.signOut();
      setLoading(false);
      return;
    }

    if ((prof as any)?.deletion_status === "pending_deletion") {
      // Restore account on login during grace period
      await sb.from("profiles").update({ deletion_status: "active", deletion_requested_at: null } as any).eq("user_id", uid);
      toast.info("Welcome back! Your account deletion has been cancelled.");
    }

    // Check admin role via secure server-side function
    const { data: isAdminRole } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
    
    setLoading(false);
    
    if (isAdminRole) {
      toast.success("Welcome, Admin!");
      navigate("/admin");
    } else if (prof?.role === "service_worker") {
      toast.success("Welcome back!");
      navigate("/worker-dashboard");
    } else if (prof?.role === "landlord") {
      toast.success("Welcome back!");
      navigate("/dashboard");
    } else {
      toast.success("Welcome back!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold mb-6">
              <Shield className="h-6 w-6 text-primary" />
              TenCheck
            </Link>
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link>
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
