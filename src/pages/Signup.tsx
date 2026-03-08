import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord">("tenant");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, { name, phone, role });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Check your email to confirm, then log in.");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4 py-12">
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
            <h1 className="font-display text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start building rental trust today</p>
          </div>

          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setRole("tenant")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${role === "tenant" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              I'm a Tenant
            </button>
            <button
              type="button"
              onClick={() => setRole("landlord")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${role === "landlord" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              I'm a Landlord
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Kamau" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            {role === "tenant" && (
              <div className="space-y-2">
                <Label htmlFor="nationalId">National ID</Label>
                <Input id="nationalId" placeholder="12345678" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </div>
            )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
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

export default Signup;
