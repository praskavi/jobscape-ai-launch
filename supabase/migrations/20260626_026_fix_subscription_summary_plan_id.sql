-- ============================================================
-- Migration: 20260626_026_fix_subscription_summary_plan_id.sql
-- KAN-40 | Fix subscription summary after Stripe checkout
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_subscription_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id       uuid := auth.uid();
    v_subscription  record;
    v_period_start  date := date_trunc('month', CURRENT_DATE)::date;
    v_period_end    date := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;
    v_features      jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'authenticated', false,
            'plan', null,
            'features', '[]'::jsonb
        );
    END IF;

    SELECT
        us.id,
        us.user_id,
        us.plan_id,
        us.status,
        us.current_period_start,
        us.current_period_end,
        sp.plan_code,
        sp.plan_name,
        sp.price_amount,
        sp.currency,
        sp.billing_period
    INTO v_subscription
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = v_user_id
      AND us.status IN ('trialing', 'active', 'past_due', 'free')
      AND sp.is_active = true
    ORDER BY
      CASE us.status
        WHEN 'active' THEN 1
        WHEN 'trialing' THEN 2
        WHEN 'past_due' THEN 3
        WHEN 'free' THEN 4
        ELSE 5
      END,
      us.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'authenticated', true,
            'plan', null,
            'features', '[]'::jsonb
        );
    END IF;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'feature_code', sf.feature_code,
                'feature_name', sf.feature_name,
                'feature_type', sf.feature_type,
                'is_enabled', pf.is_enabled,
                'usage_limit', pf.usage_limit,
                'usage_period', pf.usage_period,
                'usage_count', CASE
                    WHEN sf.feature_type = 'usage_limited' AND pf.usage_limit IS NOT NULL
                    THEN COALESCE(su.usage_count, 0)
                    ELSE null
                END,
                'remaining', CASE
                    WHEN NOT pf.is_enabled THEN 0
                    WHEN sf.feature_type = 'usage_limited' AND pf.usage_limit IS NOT NULL
                    THEN GREATEST(pf.usage_limit - COALESCE(su.usage_count, 0), 0)
                    ELSE null
                END
            )
            ORDER BY sf.feature_code
        ),
        '[]'::jsonb
    )
    INTO v_features
    FROM public.plan_features pf
    JOIN public.subscription_features sf ON sf.id = pf.feature_id
    LEFT JOIN public.subscription_usage su
        ON su.user_id = v_user_id
       AND su.feature_id = sf.id
       AND su.period_start = v_period_start
       AND su.period_end = v_period_end
    WHERE pf.plan_id = v_subscription.plan_id
      AND sf.is_active = true;

    RETURN jsonb_build_object(
        'authenticated', true,
        'plan', jsonb_build_object(
            'plan_code', v_subscription.plan_code,
            'plan_name', v_subscription.plan_name,
            'status', v_subscription.status,
            'price_amount', v_subscription.price_amount,
            'currency', v_subscription.currency,
            'billing_period', v_subscription.billing_period,
            'current_period_start', v_subscription.current_period_start,
            'current_period_end', v_subscription.current_period_end
        ),
        'period', jsonb_build_object(
            'period_start', v_period_start,
            'period_end', v_period_end
        ),
        'features', v_features
    );
END;
$$;

COMMENT ON FUNCTION public.get_user_subscription_summary() IS
  'Returns the authenticated user subscription plan and current-period feature usage for the subscription page.';

REVOKE ALL ON FUNCTION public.get_user_subscription_summary() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_subscription_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_summary() TO service_role;
