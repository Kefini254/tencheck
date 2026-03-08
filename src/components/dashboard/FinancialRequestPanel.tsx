import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banknote, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface FinancialRequestPanelProps {
  userId: string;
}

const FinancialRequestPanel = ({ userId }: FinancialRequestPanelProps) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState<"deposit" | "rent_advance">("deposit");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["financial-requests", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_requests" as any)
        .select("*")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const submitRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("financial_requests" as any).insert({
        tenant_id: userId,
        requested_amount: parseInt(amount),
        purpose,
        status: "pending",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Financial request submitted!");
      queryClient.invalidateQueries({ queryKey: ["financial-requests"] });
      setAmount("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusIcon = (status: string) => {
    if (status === "approved") return <CheckCircle className="h-4 w-4 text-primary" />;
    if (status === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const statusVariant = (status: string) =>
    status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";

  return (
    <div className="space-y-6">
      {/* Submit Request */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <Banknote className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Request Financing</h2>
            <p className="text-sm text-muted-foreground">Apply for deposit or rent advance</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitRequest.mutate();
          }}
          className="space-y-4 max-w-md"
        >
          <div className="space-y-2">
            <Label>Purpose</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value as "deposit" | "rent_advance")}
            >
              <option value="deposit">Deposit Financing</option>
              <option value="rent_advance">Rent Advance</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Amount (Ksh)</Label>
            <Input
              type="number"
              min="1000"
              placeholder="e.g. 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitRequest.isPending} className="gap-2">
            <Banknote className="h-4 w-4" />
            {submitRequest.isPending ? "Submitting..." : "Submit Request"}
          </Button>
        </form>
      </div>

      {/* Request History */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display font-bold text-lg text-foreground mb-4">Your Requests</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : requests?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No requests submitted yet</p>
        ) : (
          <div className="space-y-3">
            {requests?.map((req: any) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(req.status)}
                  <div>
                    <p className="text-sm font-semibold text-foreground capitalize">
                      {req.purpose?.replace("_", " ")} — Ksh {req.requested_amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant={statusVariant(req.status) as any} className="capitalize">
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialRequestPanel;
