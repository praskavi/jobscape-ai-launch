-- ============================================================
-- Migration: Harden subscription entitlement access
--
-- Purpose:
-- - Fix cached subscription tier sync to use user_profiles.user_id.
-- - Ensure entitlement RPCs cannot be called for another user's UUID.
-- - Expose a current-user subscription summary RPC for the frontend.
-- - Restrict the entitlement view to authenticated users and current user rows.
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_subscription_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan_code text;
BEGIN
    IF NEW.status IN ('trialing', 'active', 'past_due', 'free') THEN
        SELECT plan_code INTO v_plan_code
        FROM public.subscription_plans
        WHERE id = NEW.plan_id;

        UPDATE public.user_profiles
        SET
            subscription_tier = v_plan_code,
            updated_at = now()
        WHERE user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_subscription_tier() IS
  'Keeps user_profiles.subscription_tier in sync when a subscription is created or status changes.';

-- Keep live plan metadata and entitlements aligned with the MVP1
-- Free / Basic / Premium subscription model.
INSERT INTO public.subscription_plans (
    plan_code,
    plan_name,
    description,
    price_amount,
    currency,
    billing_period,
    is_active,
    display_order
)
VALUES
    ('free', 'Free', 'For getting started with resume matching.', 0, 'AUD', 'monthly', true, 1),
    ('basic', 'Basic', 'For active job seekers using AI-powered matching.', 19, 'AUD', 'monthly', true, 2),
    ('premium', 'Premium', 'For power users who need deeper AI assistance.', 49, 'AUD', 'monthly', true, 3)
ON CONFLICT (plan_code) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    description = EXCLUDED.description,
    price_amount = EXCLUDED.price_amount,
    currency = EXCLUDED.currency,
    billing_period = EXCLUDED.billing_period,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    updated_at = now();

INSERT INTO public.subscription_features (
    feature_code,
    feature_name,
    description,
    feature_type,
    is_active
)
VALUES
    ('job_search', 'Job Search', 'Search jobs by role, keyword, and location.', 'unlimited', true),
    ('resume_upload', 'Resume Upload', 'Active resume profiles allowed by plan.', 'usage_limited', true),
    ('ats_score', 'ATS Score Check', 'Monthly ATS score checks.', 'usage_limited', true),
    ('ai_job_match', 'AI Job Match', 'Monthly AI job match runs.', 'usage_limited', true),
    ('resume_generate', 'Resume Enhancements', 'Monthly AI resume enhancement runs.', 'usage_limited', true),
    ('cover_letter_generate', 'Cover Letter Generation', 'Monthly AI cover letter generations.', 'usage_limited', true),
    ('premium_recommendations', 'Premium Recommendations', 'Premium ranked recommendations.', 'boolean', true)
ON CONFLICT (feature_code) DO UPDATE SET
    feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    feature_type = EXCLUDED.feature_type,
    is_active = EXCLUDED.is_active,
    updated_at = now();

WITH entitlement(plan_code, feature_code, is_enabled, usage_limit, usage_period) AS (
    VALUES
        ('free', 'job_search', true, null::integer, 'monthly'),
        ('free', 'resume_upload', true, 1, 'monthly'),
        ('free', 'ats_score', true, 3, 'monthly'),
        ('free', 'ai_job_match', false, 0, 'monthly'),
        ('free', 'resume_generate', false, 0, 'monthly'),
        ('free', 'cover_letter_generate', false, 0, 'monthly'),
        ('free', 'premium_recommendations', false, 0, 'monthly'),

        ('basic', 'job_search', true, null::integer, 'monthly'),
        ('basic', 'resume_upload', true, 1, 'monthly'),
        ('basic', 'ats_score', true, 10, 'monthly'),
        ('basic', 'ai_job_match', true, 20, 'monthly'),
        ('basic', 'resume_generate', true, 10, 'monthly'),
        ('basic', 'cover_letter_generate', true, 10, 'monthly'),
        ('basic', 'premium_recommendations', true, 10, 'monthly'),

        ('premium', 'job_search', true, null::integer, 'monthly'),
        ('premium', 'resume_upload', true, 3, 'monthly'),
        ('premium', 'ats_score', true, 60, 'monthly'),
        ('premium', 'ai_job_match', true, 50, 'monthly'),
        ('premium', 'resume_generate', true, 30, 'monthly'),
        ('premium', 'cover_letter_generate', true, 20, 'monthly'),
        ('premium', 'premium_recommendations', true, 20, 'monthly')
)
INSERT INTO public.plan_features (
    plan_id,
    feature_id,
    is_enabled,
    usage_limit,
    usage_period
)
SELECT
    sp.id,
    sf.id,
    e.is_enabled,
    e.usage_limit,
    e.usage_period
FROM entitlement e
JOIN public.subscription_plans sp ON sp.plan_code = e.plan_code
JOIN public.subscription_features sf ON sf.feature_code = e.feature_code
ON CONFLICT (plan_id, feature_id) DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    usage_limit = EXCLUDED.usage_limit,
    usage_period = EXCLUDED.usage_period,
    updated_at = now();


CREATE OR REPLACE VIEW public.user_subscription_entitlements
WITH (security_invoker = true)
AS
SELECT
    us.user_id,
    sp.plan_code,
    sp.plan_name,
    us.status,
    sf.feature_code,
    sf.feature_name,
    sf.feature_type,
    pf.is_enabled,
    pf.usage_limit,
    pf.usage_period,
    us.current_period_start,
    us.current_period_end
FROM public.user_subscriptions us
JOIN public.subscription_plans sp
    ON sp.id = us.plan_id
JOIN public.plan_features pf
    ON pf.plan_id = sp.id
JOIN public.subscription_features sf
    ON sf.id = pf.feature_id
WHERE us.user_id = auth.uid()
AND us.status IN ('trialing', 'active', 'past_due', 'free')
AND sp.is_active = true
AND sf.is_active = true;

COMMENT ON VIEW public.user_subscription_entitlements IS
  'Current-user feature entitlements. Uses security_invoker and auth.uid() so frontend users only see their own subscription context.';

REVOKE ALL ON TABLE public.user_subscription_entitlements FROM anon;
GRANT SELECT ON TABLE public.user_subscription_entitlements TO authenticated;
GRANT SELECT ON TABLE public.user_subscription_entitlements TO service_role;


CREATE OR REPLACE FUNCTION public.can_use_feature(p_user_id uuid, p_feature_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_subscription      record;
    v_plan_feature      record;
    v_feature           record;
    v_usage_count       integer;
    v_period_start      date;
    v_period_end        date;
BEGIN
    IF auth.role() <> 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'unauthorized',
            'feature_code', p_feature_code
        );
    END IF;

    SELECT us.*, sp.plan_code, sp.plan_name
    INTO v_subscription
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('trialing', 'active', 'past_due', 'free')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'subscription_not_found',
            'plan_code', null,
            'feature_code', p_feature_code,
            'usage_limit', null,
            'usage_count', null,
            'remaining', null
        );
    END IF;

    SELECT * INTO v_feature
    FROM public.subscription_features
    WHERE feature_code = p_feature_code
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'feature_not_found',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code
        );
    END IF;

    SELECT pf.*
    INTO v_plan_feature
    FROM public.plan_features pf
    WHERE pf.plan_id = v_subscription.plan_id
      AND pf.feature_id = v_feature.id;

    IF NOT FOUND OR NOT v_plan_feature.is_enabled THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'feature_not_enabled',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', 0,
            'usage_count', 0,
            'remaining', 0
        );
    END IF;

    IF v_feature.feature_type = 'boolean' THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'reason', 'allowed',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', null,
            'usage_count', null,
            'remaining', null
        );
    END IF;

    IF v_feature.feature_type = 'unlimited' OR v_plan_feature.usage_limit IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'reason', 'allowed',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', null,
            'usage_count', null,
            'remaining', null
        );
    END IF;

    v_period_start := date_trunc('month', CURRENT_DATE)::date;
    v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

    SELECT COALESCE(MAX(su.usage_count), 0)
    INTO v_usage_count
    FROM public.subscription_usage su
    WHERE su.user_id = p_user_id
      AND su.feature_id = v_feature.id
      AND su.period_start = v_period_start
      AND su.period_end = v_period_end;

    IF v_usage_count >= v_plan_feature.usage_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'usage_limit_reached',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', v_plan_feature.usage_limit,
            'usage_count', v_usage_count,
            'remaining', 0
        );
    END IF;

    RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'allowed',
        'plan_code', v_subscription.plan_code,
        'feature_code', p_feature_code,
        'usage_limit', v_plan_feature.usage_limit,
        'usage_count', v_usage_count,
        'remaining', v_plan_feature.usage_limit - v_usage_count
    );
END;
$$;

COMMENT ON FUNCTION public.can_use_feature(uuid, text) IS
  'Entitlement gate. Authenticated users can only check their own user_id; service_role can check any user.';

REVOKE ALL ON FUNCTION public.can_use_feature(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_use_feature(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_use_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_feature(uuid, text) TO service_role;


CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id uuid, p_feature_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_feature       record;
    v_plan_feature  record;
    v_subscription  record;
    v_usage_count   integer := 0;
    v_period_start  date;
    v_period_end    date;
    v_lock_key      bigint;
BEGIN
    IF auth.role() <> 'service_role' AND p_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'unauthorized',
            'feature_code', p_feature_code
        );
    END IF;

    v_lock_key := ('x' || md5(p_user_id::text || p_feature_code))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    SELECT us.*, sp.plan_code
    INTO v_subscription
    FROM public.user_subscriptions us
    JOIN public.subscription_plans sp ON sp.id = us.plan_id
    WHERE us.user_id = p_user_id
      AND us.status IN ('trialing', 'active', 'past_due', 'free')
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'subscription_not_found');
    END IF;

    SELECT * INTO v_feature
    FROM public.subscription_features
    WHERE feature_code = p_feature_code
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_found');
    END IF;

    SELECT pf.* INTO v_plan_feature
    FROM public.plan_features pf
    WHERE pf.plan_id = v_subscription.plan_id
      AND pf.feature_id = v_feature.id;

    IF NOT FOUND OR NOT v_plan_feature.is_enabled THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'feature_not_enabled');
    END IF;

    IF v_feature.feature_type IN ('boolean', 'unlimited') OR v_plan_feature.usage_limit IS NULL THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'reason', 'allowed',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', null,
            'usage_count', null,
            'remaining', null
        );
    END IF;

    v_period_start := date_trunc('month', CURRENT_DATE)::date;
    v_period_end := (date_trunc('month', CURRENT_DATE) + interval '1 month - 1 day')::date;

    INSERT INTO public.subscription_usage
        (user_id, feature_id, usage_count, period_start, period_end)
    VALUES
        (p_user_id, v_feature.id, 0, v_period_start, v_period_end)
    ON CONFLICT (user_id, feature_id, period_start, period_end)
    DO NOTHING;

    SELECT usage_count INTO v_usage_count
    FROM public.subscription_usage
    WHERE user_id = p_user_id
      AND feature_id = v_feature.id
      AND period_start = v_period_start
      AND period_end = v_period_end
    FOR UPDATE;

    IF v_usage_count >= v_plan_feature.usage_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'usage_limit_reached',
            'plan_code', v_subscription.plan_code,
            'feature_code', p_feature_code,
            'usage_limit', v_plan_feature.usage_limit,
            'usage_count', v_usage_count,
            'remaining', 0
        );
    END IF;

    UPDATE public.subscription_usage
    SET
        usage_count = usage_count + 1,
        updated_at = now()
    WHERE user_id = p_user_id
      AND feature_id = v_feature.id
      AND period_start = v_period_start
      AND period_end = v_period_end;

    v_usage_count := v_usage_count + 1;

    RETURN jsonb_build_object(
        'allowed', true,
        'reason', 'incremented',
        'plan_code', v_subscription.plan_code,
        'feature_code', p_feature_code,
        'usage_limit', v_plan_feature.usage_limit,
        'usage_count', v_usage_count,
        'remaining', v_plan_feature.usage_limit - v_usage_count
    );
END;
$$;

COMMENT ON FUNCTION public.increment_usage(uuid, text) IS
  'Atomic check-and-increment. Authenticated users can only increment their own user_id; service_role can increment any user.';

REVOKE ALL ON FUNCTION public.increment_usage(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_usage(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(uuid, text) TO service_role;


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
    ORDER BY us.created_at DESC
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
