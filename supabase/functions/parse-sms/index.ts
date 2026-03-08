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
  payment_date: string | null;
}

function parseMpesaSMS(sms: string): ParsedSMS {
  const amountMatch = sms.match(/Ksh\s*(\d[\d,]*)/i);
  const codeMatch = sms.match(/Transaction\s+ID\s+([A-Z0-9]+)/i);
  const nameMatch = sms.match(/sent\s+to\s+([A-Za-z\s]+?)(?:\.|$)/i);
  const dateMatch = sms.match(
    /Date\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
  );

  return {
    amount: amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : null,
    transaction_code: codeMatch ? codeMatch[1] : null,
    receiver_name: nameMatch ? nameMatch[1].trim() : null,
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    ).auth.getUser(token);

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
    const { data: evidence, error: insertError } = await supabase
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

    // Recalculate score
    await supabase.rpc("calculate_tenant_score", { _tenant_id: user.id });

    return new Response(
      JSON.stringify({ parsed, evidence }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
