import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin");

    if (!roles?.length) throw new Error("Forbidden: admin role required");

    const body = await req.json();
    const {
      email,
      full_name,
      company,
      phone,
      plan,
      system_prompt,
      webhook_url,
      whatsapp_number,
    } = body;

    if (!email) throw new Error("Email is required");

    // Generate a temp password
    const tempPassword =
      crypto.randomUUID().slice(0, 8) + "Aa1!";

    // Create user via admin API (auto-confirms email)
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name,
          company,
          plan: (plan || "starter").toLowerCase(),
        },
      });

    if (createError) throw createError;

    const userId = newUser.user!.id;

    // Update profile (created by handle_new_user trigger)
    await supabaseAdmin
      .from("profiles")
      .update({
        phone: phone || null,
        system_prompt: system_prompt || null,
        webhook_url: webhook_url || null,
        whatsapp_number: whatsapp_number || phone || null,
        onboarding_completed: true,
        status: "active",
      })
      .eq("id", userId);

    console.log(`[CREATE-CLIENT] User created: ${email} (${userId})`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        temp_password: tempPassword,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-CLIENT] Error: ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
