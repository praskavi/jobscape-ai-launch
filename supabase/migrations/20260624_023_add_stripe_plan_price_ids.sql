-- ============================================================
-- Migration: 20260624_023_add_stripe_plan_price_ids.sql
-- KAN-40 | Stripe price id mapping for subscription plans
-- ============================================================

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_product_id text;

UPDATE public.subscription_plans
SET stripe_price_id = current_setting('app.settings.stripe_basic_price_id', true)
WHERE plan_code = 'basic'
  AND NULLIF(current_setting('app.settings.stripe_basic_price_id', true), '') IS NOT NULL;

UPDATE public.subscription_plans
SET stripe_price_id = current_setting('app.settings.stripe_premium_price_id', true)
WHERE plan_code = 'premium'
  AND NULLIF(current_setting('app.settings.stripe_premium_price_id', true), '') IS NOT NULL;

COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS
  'Stripe recurring price id used to create Checkout Sessions for paid plans.';

COMMENT ON COLUMN public.subscription_plans.stripe_product_id IS
  'Optional Stripe product id for plan metadata/reference.';
