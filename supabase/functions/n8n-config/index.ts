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

    const url = new URL(req.url);
    const tenantId = url.searchParams.get("tenant_id");
    const remoteJid = url.searchParams.get("remote_jid");

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get tenant profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check pause status for specific contact
    let shouldProcess = true;
    let pauseInfo = null;

    if (remoteJid) {
      const now = new Date().toISOString();
      const { data: interruption } = await supabase
        .from("robot_interruptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("remote_jid", remoteJid)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (interruption) {
        // Check if pause has expired
        if (interruption.expires_at && new Date(interruption.expires_at) < new Date(now)) {
          // Auto-deactivate expired pause
          await supabase
            .from("robot_interruptions")
            .update({ is_active: false })
            .eq("id", interruption.id);
        } else {
          shouldProcess = false;
          pauseInfo = {
            reason: interruption.reason,
            paused_at: interruption.paused_at,
            expires_at: interruption.expires_at,
          };
        }
      }
    }

    // 3. Get active templates
    const { data: templates } = await supabase
      .from("response_templates")
      .select("shortcut, content, category")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    // 4. Build templates object for prompt injection
    const templatesMap: Record<string, string> = {};
    templates?.forEach((t) => {
      templatesMap[t.shortcut] = t.content;
    });

    const response = {
      tenant: {
        id: profile.id,
        company: profile.company,
        plan: profile.plan,
      },
      shouldProcess,
      pauseInfo,
      templates: templatesMap,
      templatesList: templates || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
