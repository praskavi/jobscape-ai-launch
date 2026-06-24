import type { SupabaseClient } from "@supabase/supabase-js";

type BillingCustomerRow = {
  provider_customer_id: string;
};

export async function getSavedStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data: billingCustomer } = await supabase
    .from("user_billing_customers")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .eq("payment_provider", "stripe")
    .maybeSingle<BillingCustomerRow>();

  if (billingCustomer?.provider_customer_id) {
    return billingCustomer.provider_customer_id;
  }

  const { data: subscriptionCustomer } = await supabase
    .from("user_subscriptions")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .eq("payment_provider", "stripe")
    .not("provider_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<BillingCustomerRow>();

  if (subscriptionCustomer?.provider_customer_id) {
    await saveStripeCustomerId(supabase, userId, subscriptionCustomer.provider_customer_id);
    return subscriptionCustomer.provider_customer_id;
  }

  return null;
}

export async function saveStripeCustomerId(
  supabase: SupabaseClient,
  userId: string,
  customerId: string,
  billingEmail?: string | null,
) {
  const { error } = await supabase
    .from("user_billing_customers")
    .upsert(
      {
        user_id: userId,
        payment_provider: "stripe",
        provider_customer_id: customerId,
        billing_email: billingEmail ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,payment_provider" },
    );

  if (error) {
    throw error;
  }
}

export async function findUserIdByStripeCustomerId(
  supabase: SupabaseClient,
  customerId: string,
) {
  const { data: billingCustomer } = await supabase
    .from("user_billing_customers")
    .select("user_id")
    .eq("payment_provider", "stripe")
    .eq("provider_customer_id", customerId)
    .maybeSingle<{ user_id: string }>();

  if (billingCustomer?.user_id) {
    return billingCustomer.user_id;
  }

  const { data: subscriptionCustomer } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("provider_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ user_id: string }>();

  return subscriptionCustomer?.user_id ?? null;
}
