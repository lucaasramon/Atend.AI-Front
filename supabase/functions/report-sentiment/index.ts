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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { tenant_id, remote_jid, contact_name, sentiment_score } = await req.json();

    if (!tenant_id || !remote_jid || sentiment_score === undefined) {
      return new Response(
        JSON.stringify({ error: "tenant_id, remote_jid, and sentiment_score are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const NEGATIVE_THRESHOLD = 0.3;
    let interventionCreated = false;

    if (sentiment_score < NEGATIVE_THRESHOLD) {
      // Check if there's already an active pause
      const { data: existing } = await supabase
        .from("robot_interruptions")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("remote_jid", remote_jid)
        .eq("is_active", true)
        .maybeSingle();

      if (!existing) {
        await supabase.from("robot_interruptions").insert({
          tenant_id,
          remote_jid,
          contact_name: contact_name || null,
          reason: `sentiment_alert:${sentiment_score}`,
          expires_at: null, // Indefinite until human reviews
          is_active: true,
          created_by: "system",
        });
        interventionCreated = true;
      }
    }

    return new Response(
      JSON.stringify({
        sentiment_score,
        below_threshold: sentiment_score < NEGATIVE_THRESHOLD,
        intervention_created: interventionCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
