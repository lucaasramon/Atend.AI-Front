import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let priceId = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      try {
        const endTimestamp = subscription.current_period_end;
        logStep("Subscription end timestamp", { endTimestamp, type: typeof endTimestamp });
        if (endTimestamp && typeof endTimestamp === "number") {
          subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
        }
      } catch (dateError) {
        logStep("Date conversion error, skipping", { error: String(dateError) });
      }
      priceId = subscription.items.data[0]?.price?.id ?? null;
      logStep("Active subscription found", { priceId, subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    // Get default payment method info
    let cardInfo = null;
    try {
      const customer = customers.data[0];
      const defaultPmId = customer.invoice_settings?.default_payment_method;
      if (defaultPmId) {
        const pm = await stripe.paymentMethods.retrieve(defaultPmId as string);
        if (pm.card) {
          cardInfo = {
            brand: pm.card.brand,
            last4: pm.card.last4,
            exp_month: pm.card.exp_month,
            exp_year: pm.card.exp_year,
          };
        }
      } else {
        // Try to get from subscriptions default payment method
        if (hasActiveSub) {
          const subPmId = subscriptions.data[0].default_payment_method;
          if (subPmId) {
            const pm = await stripe.paymentMethods.retrieve(subPmId as string);
            if (pm.card) {
              cardInfo = {
                brand: pm.card.brand,
                last4: pm.card.last4,
                exp_month: pm.card.exp_month,
                exp_year: pm.card.exp_year,
              };
            }
          }
        }
      }
      logStep("Card info retrieved", cardInfo);
    } catch (cardError) {
      logStep("Could not retrieve card info", { error: String(cardError) });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      price_id: priceId,
      subscription_end: subscriptionEnd,
      card_info: cardInfo,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
