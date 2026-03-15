import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not set" });
    return new Response("Server error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const body = await req.text();
  let event: Stripe.Event;

  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Missing signature", { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    event = JSON.parse(body);
    logStep("WARNING: No webhook secret, skipping signature verification");
  }

  logStep("Event received", { type: event.type, id: event.id });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerEmail = session.customer_details?.email;
        logStep("Checkout completed", { email: customerEmail, customer: session.customer });

        if (customerEmail) {
          // Find user by email and update profile status
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customerEmail);

          if (matchedUser) {
            // Get the subscription to find the plan
            if (session.subscription) {
              const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
              const priceId = subscription.items.data[0]?.price?.id;

              logStep("Updating profile", { userId: matchedUser.id, priceId });

              await supabaseClient
                .from("profiles")
                .update({ status: "active" })
                .eq("id", matchedUser.id);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);

        if ("email" in customer && customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            const status = subscription.status === "active" ? "active" : "inactive";
            logStep("Subscription updated", { userId: matchedUser.id, status });

            await supabaseClient
              .from("profiles")
              .update({ status })
              .eq("id", matchedUser.id);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);

        if ("email" in customer && customer.email) {
          const { data: userData } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = userData?.users?.find(u => u.email === customer.email);

          if (matchedUser) {
            logStep("Subscription deleted", { userId: matchedUser.id });

            await supabaseClient
              .from("profiles")
              .update({ status: "inactive" })
              .eq("id", matchedUser.id);
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
