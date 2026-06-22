import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/utils/supabase/server";

type EntitlementResult = {
  allowed?: boolean;
  reason?: string;
  plan_code?: string | null;
  feature_code?: string;
  usage_limit?: number | null;
  usage_count?: number | null;
  remaining?: number | null;
};

const ADMIN_EMAILS = new Set(["dittprashant@gmail.com"]);

export function isSubscriptionAdmin(email?: string | null) {
  return email ? ADMIN_EMAILS.has(email.toLowerCase()) : false;
}

async function getEntitlementClient(request: Request) {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );
  }

  return createServerClient();
}

export async function requireFeatureAccess(
  request: Request,
  userId: string,
  featureCode: string,
  userEmail?: string | null,
) {
  if (isSubscriptionAdmin(userEmail)) {
    return {
      response: null,
      entitlement: {
        allowed: true,
        reason: "admin_bypass",
        plan_code: "admin",
        feature_code: featureCode,
        usage_limit: null,
        usage_count: null,
        remaining: null,
      } satisfies EntitlementResult,
    };
  }

  const supabase = await getEntitlementClient(request);
  const { data, error } = await supabase.rpc("can_use_feature", {
    p_user_id: userId,
    p_feature_code: featureCode,
  });

  if (error) {
    console.error(`Subscription entitlement check failed for ${featureCode}`, error);
    return {
      response: NextResponse.json(
        { error: "Could not verify subscription entitlement." },
        { status: 503 },
      ),
      entitlement: null,
    };
  }

  const entitlement = data as EntitlementResult;

  if (!entitlement.allowed) {
    return {
      response: NextResponse.json(
        {
          error: "Subscription limit reached",
          reason: entitlement.reason ?? "feature_not_allowed",
          featureCode,
          planCode: entitlement.plan_code ?? null,
          usageLimit: entitlement.usage_limit ?? null,
          usageCount: entitlement.usage_count ?? null,
          remaining: entitlement.remaining ?? null,
        },
        { status: 402 },
      ),
      entitlement,
    };
  }

  return { response: null, entitlement };
}

export async function recordFeatureUsage(
  request: Request,
  userId: string,
  featureCode: string,
  userEmail?: string | null,
) {
  if (isSubscriptionAdmin(userEmail)) {
    return {
      allowed: true,
      reason: "admin_bypass",
      plan_code: "admin",
      feature_code: featureCode,
      usage_limit: null,
      usage_count: null,
      remaining: null,
    } satisfies EntitlementResult;
  }

  const supabase = await getEntitlementClient(request);
  const { data, error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_feature_code: featureCode,
  });

  if (error) {
    console.error(`Subscription usage increment failed for ${featureCode}`, error);
    return null;
  }

  return data as EntitlementResult;
}
