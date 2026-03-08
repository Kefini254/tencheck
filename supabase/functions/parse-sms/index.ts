import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ParsedSMS {
  amount: number | null;
  transaction_code: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  payment_date: string | null;
}

function parseMpesaSMS(sms: string): ParsedSMS {
  const amountMatch = sms.match(/Ksh\s*(\d[\d,]*)/i);
  const codeMatch = sms.match(/(?:Transaction\s+(?:ID|Code)\s+|^)([A-Z0-9]{10})/im);
  const nameMatch = sms.match(/sent\s+to\s+([A-Za-z\s]+?)(?:\s+(?:\d|on|for)|\.|$)/i);
  const phoneMatch = sms.match(/(?:to|for)\s+((?:0|\+?254)\d{9})/i);
  const dateMatch = sms.match(
    /(?:Date|on)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
  );

  return {
    amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : null,
    transaction_code: codeMatch ? codeMatch[1] : null,
    receiver_name: nameMatch ? nameMatch[1].trim() : null,
    receiver_phone: phoneMatch ? phoneMatch[1] : null,
    payment_date: dateMatch ? dateMatch[1] : null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sms_text } = await req.json();

    if (!sms_text || typeof sms_text !== "string") {
      return new Response(
        JSON.stringify({ error: "sms_text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseMpesaSMS(sms_text);

    // Store evidence
    const { data: evidence, error: insertError } = await serviceClient
      .from("payment_evidence")
      .insert({
        tenant_id: user.id,
        transaction_code: parsed.transaction_code,
        amount: parsed.amount,
        receiver_name: parsed.receiver_name,
        payment_date: parsed.payment_date,
        evidence_type: "sms",
        raw_text: sms_text,
        verification_status: parsed.transaction_code ? "verified" : "pending",
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== AUTO-RECONCILIATION =====
    // Try to match to a landlord and auto-create a rent_transaction
    let reconciled = false;
    let matchedLandlord: any = null;

    if (parsed.amount && parsed.transaction_code) {
      // 1. Try matching by receiver phone
      if (parsed.receiver_phone) {
        const { data: landlordProfile } = await serviceClient
          .from("profiles")
          .select("user_id, name")
          .eq("phone", parsed.receiver_phone)
          .eq("role", "landlord")
          .maybeSingle();
        if (landlordProfile) matchedLandlord = landlordProfile;
      }

      // 2. Try matching by receiver name (fuzzy)
      if (!matchedLandlord && parsed.receiver_name) {
        const { data: landlordProfiles } = await serviceClient
          .from("profiles")
          .select("user_id, name")
          .eq("role", "landlord");

        if (landlordProfiles) {
          const normalizedReceiver = parsed.receiver_name.toLowerCase().replace(/\s+/g, " ").trim();
          for (const lp of landlordProfiles) {
            const normalizedName = (lp.name || "").toLowerCase().replace(/\s+/g, " ").trim();
            if (normalizedName && normalizedReceiver.includes(normalizedName) || normalizedName.includes(normalizedReceiver)) {
              matchedLandlord = lp;
              break;
            }
          }
        }
      }

      // 3. If matched, check for duplicate transaction code and create rent_transaction
      if (matchedLandlord) {
        const { data: existingTxn } = await serviceClient
          .from("rent_transactions")
          .select("id")
          .eq("mpesa_transaction_code", parsed.transaction_code)
          .maybeSingle();

        if (!existingTxn) {
          const { error: txnError } = await serviceClient
            .from("rent_transactions")
            .insert({
              tenant_id: user.id,
              landlord_id: matchedLandlord.user_id,
              amount: parsed.amount,
              payment_method: "mpesa",
              mpesa_transaction_code: parsed.transaction_code,
              verification_status: "confirmed",
              payment_date: parsed.payment_date || new Date().toISOString().split("T")[0],
            });

          if (!txnError) {
            reconciled = true;
          }
        }
      }
    }

    // Recalculate scores
    await serviceClient.rpc("calculate_tenant_score", { _tenant_id: user.id });
    await serviceClient.rpc("calculate_credit_passport", { _tenant_id: user.id });

    return new Response(
      JSON.stringify({
        parsed,
        evidence,
        reconciled,
        matched_landlord: matchedLandlord ? matchedLandlord.name : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
