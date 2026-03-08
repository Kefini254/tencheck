import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode } = body; // "tenant" or "landlord"

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (mode === "tenant") {
      // Tenant wants property recommendations
      const { data: profile } = await serviceClient.from("profiles").select("*").eq("user_id", user.id).single();
      const { data: passport } = await serviceClient.from("tenant_credit_passport").select("*").eq("tenant_id", user.id).maybeSingle();
      const { data: properties } = await serviceClient.from("properties").select("*").eq("is_available", true).limit(50);

      if (!properties?.length) {
        return new Response(JSON.stringify({ matches: [], explanation: "No properties available." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `You are a Kenyan rental property matching AI for TenCheck.

Tenant profile:
- Name: ${profile?.name || "Unknown"}
- Credit Score: ${passport?.credit_score ?? "N/A"}/100
- Confidence: ${passport?.confidence_level ?? "low"}
- Verified Payments: ${passport?.total_verified_rent_payments ?? 0}
- Late Payments: ${passport?.late_payments_count ?? 0}

Available properties (JSON):
${JSON.stringify(properties.map(p => ({ id: p.id, title: p.title, location: p.location, rent: p.rent_amount, bedrooms: p.bedrooms, bathrooms: p.bathrooms })), null, 2)}

Based on the tenant's credit profile, rank the top 5 best-fit properties. Consider affordability (credit score affects max rent the tenant can realistically sustain), location variety, and unit size. Return ONLY a JSON array of objects with: property_id, rank (1-5), match_score (0-100), reason (1 sentence). No markdown, just JSON.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";

      // Extract JSON from response
      let matches = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        matches = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch { matches = []; }

      // Enrich with property details
      const propertyMap = Object.fromEntries(properties.map(p => [p.id, p]));
      const enriched = matches.map((m: any) => ({
        ...m,
        property: propertyMap[m.property_id] || null,
      })).filter((m: any) => m.property);

      return new Response(JSON.stringify({ matches: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "landlord") {
      // Landlord wants tenant recommendations for a property
      const { property_id } = body;
      if (!property_id) {
        return new Response(JSON.stringify({ error: "property_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: property } = await serviceClient.from("properties").select("*").eq("id", property_id).single();
      if (!property) {
        return new Response(JSON.stringify({ error: "Property not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get tenants who inquired about this property
      const { data: inquiries } = await serviceClient.from("inquiries").select("tenant_id").eq("property_id", property_id);
      const tenantIds = [...new Set((inquiries || []).map(i => i.tenant_id))];

      if (!tenantIds.length) {
        return new Response(JSON.stringify({ matches: [], explanation: "No applicants yet." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: passports } = await serviceClient.from("tenant_credit_passport").select("*").in("tenant_id", tenantIds);
      const { data: profiles } = await serviceClient.from("profiles").select("user_id, name, phone").in("user_id", tenantIds);

      const tenantData = tenantIds.map(tid => {
        const p = (profiles || []).find(pr => pr.user_id === tid);
        const cp = (passports || []).find(pp => pp.tenant_id === tid);
        return {
          tenant_id: tid,
          name: p?.name || "Unknown",
          credit_score: cp?.credit_score ?? null,
          confidence: cp?.confidence_level ?? "low",
          verified_payments: cp?.total_verified_rent_payments ?? 0,
          late_payments: cp?.late_payments_count ?? 0,
        };
      });

      const prompt = `You are a Kenyan tenant ranking AI for TenCheck.

Property: ${property.title} in ${property.location}, Ksh ${property.rent_amount}/mo, ${property.bedrooms}BR/${property.bathrooms}BA

Applicant tenants (JSON):
${JSON.stringify(tenantData, null, 2)}

Rank all applicants by suitability. Consider credit score, payment history reliability, and confidence level. Return ONLY a JSON array of objects with: tenant_id, rank, match_score (0-100), reason (1 sentence). No markdown, just JSON.`;

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!aiResp.ok) {
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResp.status}`);
      }

      const aiData = await aiResp.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";

      let matches = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        matches = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch { matches = []; }

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      const passportMap = Object.fromEntries((passports || []).map(p => [p.tenant_id, p]));
      const enriched = matches.map((m: any) => ({
        ...m,
        profile: profileMap[m.tenant_id] || null,
        passport: passportMap[m.tenant_id] || null,
      }));

      return new Response(JSON.stringify({ matches: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use 'tenant' or 'landlord'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-match error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
