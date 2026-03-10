import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Coins, Plus, ShoppingCart, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const ServiceCreditsPanel = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [txnCode, setTxnCode] = useState("");

  const { data: credits } = useQuery({
    queryKey: ["service-credits", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_service_credits")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ["credit-purchases", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("service_credit_purchases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const initCredits = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_service_credits").insert({
        user_id: userId,
        credits_remaining: 3,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["service-credits"] }),
  });

  const purchaseCredits = useMutation({
    mutationFn: async () => {
      const amount = parseInt(purchaseAmount);
      if (!amount || amount < 1) throw new Error("Invalid amount");
      const pricePerCredit = 50; // Ksh 50 per credit

      // Record purchase
      await supabase.from("service_credit_purchases").insert({
        user_id: userId,
        credits_purchased: amount,
        payment_amount: amount * pricePerCredit,
        payment_method: "mpesa",
        transaction_code: txnCode || null,
      });

      // Update credits
      if (credits) {
        await supabase
          .from("user_service_credits")
          .update({ credits_remaining: credits.credits_remaining + amount })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_service_credits").insert({
          user_id: userId,
          credits_remaining: amount + 3,
        });
      }
    },
    onSuccess: () => {
      toast.success("Credits purchased!");
      queryClient.invalidateQueries({ queryKey: ["service-credits"] });
      queryClient.invalidateQueries({ queryKey: ["credit-purchases"] });
      setPurchaseAmount("");
      setTxnCode("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Auto-init credits
  if (!credits && !initCredits.isPending) {
    initCredits.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-accent">
            <Coins className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Service Credits</h2>
            <p className="text-sm text-muted-foreground">Credits for service requests</p>
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <p className="text-4xl font-display font-bold text-foreground">{credits?.credits_remaining ?? 3}</p>
          <p className="text-sm text-muted-foreground">credits remaining</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Buy More Credits</p>
          <p className="text-xs text-muted-foreground">Ksh 50 per credit</p>
          <div className="flex gap-2">
            <Input type="number" placeholder="Amount" value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)} min="1" className="w-24" />
            <Input placeholder="M-Pesa code (optional)" value={txnCode} onChange={e => setTxnCode(e.target.value)} className="flex-1" />
            <Button onClick={() => purchaseCredits.mutate()} disabled={purchaseCredits.isPending} className="shrink-0 gap-1">
              <ShoppingCart className="h-4 w-4" /> Buy
            </Button>
          </div>
        </div>
      </div>

      {purchases && purchases.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-bold text-foreground mb-3">Purchase History</h3>
          <div className="space-y-2">
            {purchases.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.credits_purchased} credits</p>
                  <p className="text-xs text-muted-foreground">Ksh {p.payment_amount} • {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceCreditsPanel;
