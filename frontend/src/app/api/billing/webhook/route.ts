import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { findUserIdByStripeCustomerId, saveStripeCustomerId } from "@/lib/stripe/customers";
import { getStripe, mapStripeSubscriptionStatus } from "@/lib/stripe/server";

type SubscriptionPlanRow = {
  id: string;
  plan_code: string;
  stripe_price_id: string | null;
};

function getUnixDate(value: number | null | undefined) {
  return value ? new Date(value * 1000).toISOString() : null;
}

async function findPlanForSubscription(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  subscription: Stripe.Subscription,
): Promise<SubscriptionPlanRow | null> {
  const planCode = subscription.metadata?.plan_code;
  if (planCode) {
    const { data } = await supabase
      .from("subscription_plans")
      .select("id, plan_code, stripe_price_id")
      .eq("plan_code", planCode)
      .maybeSingle<SubscriptionPlanRow>();
    if (data) {
      return data;
    }
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    return null;
  }

  const { data } = await supabase
    .from("subscription_plans")
    .select("id, plan_code, stripe_price_id")
    .eq("stripe_price_id", priceId)
    .maybeSingle<SubscriptionPlanRow>();

  return data ?? null;
}

async function resolveUserId(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  subscription: Stripe.Subscription,
) {
  if (subscription.metadata?.user_id) {
    return subscription.metadata.user_id;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  return findUserIdByStripeCustomerId(supabase, customerId);
}

async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const supabase = createServiceSupabaseClient();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const userId = await resolveUserId(supabase, subscription);
  const plan = await findPlanForSubscription(supabase, subscription);

  if (!userId || !plan) {
    return null;
  }

  await saveStripeCustomerId(supabase, userId, customerId);

  const stripeSubscription = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
    canceled_at?: number | null;
    ended_at?: number | null;
  };

  const payload = {
    user_id: userId,
    plan_id: plan.id,
    status: mapStripeSubscriptionStatus(subscription.status),
    payment_provider: "stripe",
    provider_customer_id: customerId,
    provider_subscription_id: subscription.id,
    current_period_start: getUnixDate(stripeSubscription.current_period_start) ?? new Date().toISOString(),
    current_period_end: getUnixDate(stripeSubscription.current_period_end),
    cancelled_at: getUnixDate(stripeSubscription.canceled_at),
    ended_at: getUnixDate(stripeSubscription.ended_at),
    updated_at: new Date().toISOString(),
  };

  if (["trialing", "active", "past_due", "free"].includes(payload.status)) {
    await supabase
      .from("user_subscriptions")
      .update({
        status: "expired",
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .in("status", ["trialing", "active", "past_due", "free"]);
  }

  const { error } = await supabase
    .from("user_subscriptions")
    .upsert(payload, { onConflict: "provider_subscription_id" });

  if (error) {
    throw error;
  }

  return { userId, planCode: plan.plan_code };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (typeof session.subscription !== "string") {
    return null;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  return syncStripeSubscription(subscription);
}

async function recordPaymentEvent(
  event: Stripe.Event,
  userId: string | null,
  processed: boolean,
) {
  const supabase = createServiceSupabaseClient();
  await supabase.from("payment_events").upsert(
    {
      user_id: userId,
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      event_payload: event as unknown as Record<string, unknown>,
      processed,
      processed_at: processed ? new Date().toISOString() : null,
    },
    { onConflict: "provider_event_id" },
  );
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!process.env.STRIPE_SECRET_KEY || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  const rawBody = await request.text();

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${error.message}` }, { status: 400 });
  }

  let userId: string | null = null;
  let processed = false;

  try {
    if (event.type === "checkout.session.completed") {
      const result = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      userId = result?.userId ?? null;
      processed = true;
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const result = await syncStripeSubscription(event.data.object as Stripe.Subscription);
      userId = result?.userId ?? null;
      processed = true;
    }

    await recordPaymentEvent(event, userId, processed);
  } catch (error) {
    await recordPaymentEvent(event, userId, false);
    throw error;
  }

  return NextResponse.json({ received: true });
}
