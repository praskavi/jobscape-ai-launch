-- ============================================================
-- Migration: 20260624_024_add_stripe_subscription_unique_key.sql
-- KAN-40 | Idempotent Stripe subscription webhook sync
-- ============================================================

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_provider_subscription_id_key
  UNIQUE (provider_subscription_id);

COMMENT ON CONSTRAINT user_subscriptions_provider_subscription_id_key
  ON public.user_subscriptions IS
  'Allows idempotent Stripe webhook upserts by provider_subscription_id. Multiple NULL values are allowed by PostgreSQL unique constraints.';
