import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PasswordStrengthIndicator, isPasswordStrong } from "@/components/PasswordStrengthIndicator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AccountSettings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error("Password does not meet strength requirements");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated!");
      setPassword("");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ deletion_status: "pending_deletion", deletion_requested_at: new Date().toISOString() } as any)
      .eq("user_id", user!.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account scheduled for deletion. You have 7 days to cancel by logging in again.");
      await signOut();
      navigate("/");
    }
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="font-display text-2xl font-bold">Account Settings</h1>
        </div>

        {/* Change Password */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <PasswordStrengthIndicator password={password} />
            </div>
            <Button type="submit" disabled={loading || !isPasswordStrong(password)}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>

        {/* Delete Account */}
        <div className="rounded-2xl border border-destructive/30 bg-card p-6 space-y-4">
          <h2 className="font-display font-bold text-lg text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Delete Account
          </h2>
          <p className="text-sm text-muted-foreground">
            Your account will enter a 7-day grace period. During this time, logging in will cancel the deletion.
            After 7 days, your account and all associated data will be permanently removed.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? "Processing..." : "Delete My Account"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your account will be scheduled for deletion. You have 7 days to cancel by logging back in.
                  After 7 days, all your data will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
