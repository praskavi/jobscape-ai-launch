import { NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getSavedStripeCustomerId, saveStripeCustomerId } from "@/lib/stripe/customers";
import { getAppUrl, getStripe, getStripePriceIdForPlan } from "@/lib/stripe/server";
import { createClient } from "@/utils/supabase/server";

type CheckoutRequestBody = {
  planCode?: string;
};

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }
  const stripe = getStripe();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
  const planCode = body.planCode;

  if (!planCode || planCode === "free") {
    return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 });
  }

  const serviceSupabase = createServiceSupabaseClient();
  const { data: plan, error: planError } = await serviceSupabase
    .from("subscription_plans")
    .select("id, plan_code, plan_name, stripe_price_id, is_active")
    .eq("plan_code", planCode)
    .eq("is_active", true)
    .maybeSingle<{
      id: string;
      plan_code: string;
      plan_name: string;
      stripe_price_id: string | null;
      is_active: boolean;
    }>();

  if (planError || !plan) {
    return NextResponse.json({ error: "Plan not found." }, { status: 404 });
  }

  const priceId = getStripePriceIdForPlan(plan.plan_code, plan.stripe_price_id);
  if (!priceId) {
    return NextResponse.json({ error: "Stripe price id is not configured for this plan." }, { status: 500 });
  }

  let customerId = await getSavedStripeCustomerId(serviceSupabase, user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        user_id: user.id,
      },
    });
    customerId = customer.id;
    await saveStripeCustomerId(serviceSupabase, user.id, customerId, user.email);
  }

  const appUrl = getAppUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/subscription?checkout=cancelled`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan_code: plan.plan_code,
      },
    },
    metadata: {
      user_id: user.id,
      plan_code: plan.plan_code,
    },
  });

  return NextResponse.json({ url: session.url });
}
