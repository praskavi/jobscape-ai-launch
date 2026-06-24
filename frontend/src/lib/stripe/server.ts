import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2026-05-27.dahlia",
  });

  return stripeClient;
}

export function getAppUrl(request?: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configuredUrl) {
    return configuredUrl;
  }

  if (request) {
    const origin = request.headers.get("origin");
    if (origin) {
      return origin.replace(/\/$/, "");
    }
  }

  return "http://localhost:3000";
}

export function getStripePriceIdForPlan(planCode: string, databasePriceId?: string | null) {
  if (databasePriceId) {
    return databasePriceId;
  }

  if (planCode === "basic") {
    return process.env.STRIPE_BASIC_PRICE_ID || null;
  }

  if (planCode === "premium") {
    return process.env.STRIPE_PREMIUM_PRICE_ID || null;
  }

  return null;
}

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "canceled" || status === "incomplete_expired") {
    return "cancelled";
  }

  if (status === "unpaid") {
    return "expired";
  }

  if (status === "incomplete") {
    return "past_due";
  }

  return status;
}
