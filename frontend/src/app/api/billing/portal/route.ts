import { NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { getSavedStripeCustomerId } from "@/lib/stripe/customers";
import { getAppUrl, getStripe, getStripePriceIdForPlan } from "@/lib/stripe/server";
import { createClient } from "@/utils/supabase/server";

type PortalRequestBody = {
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

  const serviceSupabase = createServiceSupabaseClient();
  const customerId = await getSavedStripeCustomerId(serviceSupabase, user.id);

  if (!customerId) {
    return NextResponse.json({ error: "No Stripe billing account found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as PortalRequestBody;
  const targetPlanCode = body.planCode;
  const appUrl = getAppUrl(request);

  if (targetPlanCode && targetPlanCode !== "free") {
    const { data: targetPlan, error: targetPlanError } = await serviceSupabase
      .from("subscription_plans")
      .select("id, plan_code, stripe_price_id, is_active")
      .eq("plan_code", targetPlanCode)
      .eq("is_active", true)
      .maybeSingle<{
        id: string;
        plan_code: string;
        stripe_price_id: string | null;
        is_active: boolean;
      }>();

    if (targetPlanError || !targetPlan) {
      return NextResponse.json({ error: "Plan not found." }, { status: 404 });
    }

    const targetPriceId = getStripePriceIdForPlan(targetPlan.plan_code, targetPlan.stripe_price_id);
    if (!targetPriceId) {
      return NextResponse.json({ error: "Stripe price id is not configured for this plan." }, { status: 500 });
    }

    const { data: currentSubscription } = await serviceSupabase
      .from("user_subscriptions")
      .select("provider_subscription_id, plan_id")
      .eq("user_id", user.id)
      .eq("payment_provider", "stripe")
      .in("status", ["trialing", "active", "past_due"])
      .not("provider_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ provider_subscription_id: string | null; plan_id: string }>();

    if (!currentSubscription?.provider_subscription_id) {
      return NextResponse.json({ error: "No active Stripe subscription found." }, { status: 404 });
    }

    if (currentSubscription.plan_id === targetPlan.id) {
      return NextResponse.json({ error: "This is already your current plan." }, { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(currentSubscription.provider_subscription_id);
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      return NextResponse.json({ error: "Stripe subscription item not found." }, { status: 404 });
    }

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${appUrl}/subscription`,
        flow_data: {
          type: "subscription_update_confirm",
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: `${appUrl}/subscription?billing=updated`,
            },
          },
          subscription_update_confirm: {
            subscription: subscription.id,
            items: [
              {
                id: subscriptionItem.id,
                price: targetPriceId,
                quantity: subscriptionItem.quantity,
              },
            ],
          },
        },
      });

      return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
      if (
        typeof error?.message === "string" &&
        error.message.toLowerCase().includes("subscription update feature")
      ) {
        return NextResponse.json(
          { error: "Stripe Billing Portal subscription updates are not enabled." },
          { status: 502 },
        );
      }

      throw error;
    }
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/subscription`,
  });

  return NextResponse.json({ url: portalSession.url });
}
