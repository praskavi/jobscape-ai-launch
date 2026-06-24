-- ============================================================
-- Migration: 20260624_025_create_user_billing_customers.sql
-- KAN-41 | Durable Stripe customer mapping
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text NOT NULL,
  billing_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_billing_customers_user_provider_key
    UNIQUE (user_id, payment_provider),
  CONSTRAINT user_billing_customers_provider_customer_key
    UNIQUE (payment_provider, provider_customer_id)
);

CREATE INDEX IF NOT EXISTS user_billing_customers_user_id_idx
  ON public.user_billing_customers (user_id);

DROP TRIGGER IF EXISTS set_user_billing_customers_updated_at
  ON public.user_billing_customers;

CREATE TRIGGER set_user_billing_customers_updated_at
  BEFORE UPDATE ON public.user_billing_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.user_billing_customers (
  user_id,
  payment_provider,
  provider_customer_id
)
SELECT DISTINCT ON (us.user_id, us.payment_provider)
  us.user_id,
  us.payment_provider,
  us.provider_customer_id
FROM public.user_subscriptions us
WHERE us.payment_provider = 'stripe'
  AND us.provider_customer_id IS NOT NULL
ORDER BY us.user_id, us.payment_provider, us.created_at DESC
ON CONFLICT (user_id, payment_provider) DO UPDATE
SET provider_customer_id = EXCLUDED.provider_customer_id,
    updated_at = now();

ALTER TABLE public.user_billing_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own billing customers"
  ON public.user_billing_customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON TABLE public.user_billing_customers TO authenticated;
GRANT ALL ON TABLE public.user_billing_customers TO service_role;

COMMENT ON TABLE public.user_billing_customers IS
  'Durable mapping from application users to payment provider customer ids.';

COMMENT ON COLUMN public.user_billing_customers.provider_customer_id IS
  'Stripe customer id, e.g. cus_..., reused for Checkout and Billing Portal.';
