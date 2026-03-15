import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;
    const body = await req.json();
    const { action } = body;

    if (action === "record") {
      const { tenant_id, property_id, amount, payment_method, mpesa_transaction_code } = body;
      const landlord_id = userId; // Always from JWT

      // Verify landlord has a tenancy relationship with this tenant
      const { data: tenancyRel } = await supabase.from("tenancy_records")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("landlord_id", landlord_id)
        .limit(1)
        .maybeSingle();

      if (!tenancyRel) {
        return new Response(JSON.stringify({ error: "No tenancy relationship with this tenant" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.from("rent_transactions").insert({
        tenant_id,
        property_id: property_id || null,
        landlord_id,
        amount,
        payment_method: payment_method || "mpesa",
        mpesa_transaction_code: mpesa_transaction_code || null,
        verification_status: payment_method === "mpesa" && mpesa_transaction_code ? "confirmed" : "pending",
      }).select().single();

      if (error) throw error;

      // Update tenant score
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient.rpc("calculate_tenant_score", { _tenant_id: tenant_id });

      return new Response(JSON.stringify({ success: true, transaction: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "wallet-deposit") {
      const { amount } = body;

      // Validate amount
      if (!amount || typeof amount !== "number" || amount <= 0 || amount > 500000) {
        return new Response(JSON.stringify({ error: "Invalid deposit amount (1 - 500,000)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use service role to update wallet (clients cannot write directly)
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: wallet } = await serviceClient
        .from("tenant_wallets")
        .select("*")
        .eq("tenant_id", userId)
        .maybeSingle();

      if (wallet) {
        const { error } = await serviceClient
          .from("tenant_wallets")
          .update({ balance: wallet.balance + amount })
          .eq("tenant_id", userId);
        if (error) throw error;
      } else {
        const { error } = await serviceClient
          .from("tenant_wallets")
          .insert({ tenant_id: userId, balance: amount });
        if (error) throw error;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "wallet-pay") {
      const { property_id, landlord_id, amount } = body;

      if (!amount || typeof amount !== "number" || amount <= 0) {
        return new Response(JSON.stringify({ error: "Invalid payment amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use service role for wallet operations
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: wallet } = await serviceClient
        .from("tenant_wallets")
        .select("*")
        .eq("tenant_id", userId)
        .single();

      if (!wallet || wallet.balance < amount) {
        return new Response(JSON.stringify({ error: "Insufficient wallet balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct from wallet using service role
      await serviceClient
        .from("tenant_wallets")
        .update({ balance: wallet.balance - amount })
        .eq("tenant_id", userId);

      // Record transaction
      const { data: txn, error } = await supabase.from("rent_transactions").insert({
        tenant_id: userId,
        property_id: property_id || null,
        landlord_id,
        amount,
        payment_method: "wallet",
        verification_status: "confirmed",
      }).select().single();

      if (error) throw error;

      // Update score
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await serviceClient.rpc("calculate_tenant_score", { _tenant_id: userId });

      return new Response(JSON.stringify({ success: true, transaction: txn }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm") {
      const { transaction_id } = body;
      const { error } = await supabase
        .from("rent_transactions")
        .update({ verification_status: "confirmed" })
        .eq("id", transaction_id);

      if (error) throw error;

      // Get tenant_id to recalculate score
      const { data: txn } = await supabase
        .from("rent_transactions")
        .select("tenant_id")
        .eq("id", transaction_id)
        .single();

      if (txn) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await serviceClient.rpc("calculate_tenant_score", { _tenant_id: txn.tenant_id });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
