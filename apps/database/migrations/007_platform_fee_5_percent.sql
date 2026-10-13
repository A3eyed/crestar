-- =============================================================================
-- 007_platform_fee_5_percent.sql
-- Crestar platform fee is a flat 5% on every program (seller, FoodHub, creator,
-- deliverer). No subscriptions. No tiers.
-- =============================================================================

-- Column default for new orders
ALTER TABLE public.orders
  ALTER COLUMN platform_fee_rate SET DEFAULT 0.0500;

-- Settings table (used by admin / docs)
UPDATE public.app_settings
SET value = '5',
    description = 'Flat Crestar platform fee expressed as a percentage',
    updated_at = now()
WHERE key = 'platform_fee_percent';

UPDATE public.app_settings
SET value = '0.05',
    description = 'Flat Crestar platform fee applied to every program (seller, foodhub, creator, deliverer). 5%.',
    updated_at = now()
WHERE key = 'platform_fee_rate';

-- Insert if missing (idempotent)
INSERT INTO public.app_settings (key, value, description)
SELECT 'platform_fee_percent', '5', 'Flat Crestar platform fee expressed as a percentage'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'platform_fee_percent');

INSERT INTO public.app_settings (key, value, description)
SELECT 'platform_fee_rate', '0.05', 'Flat Crestar platform fee applied to every program (seller, foodhub, creator, deliverer). 5%.'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings WHERE key = 'platform_fee_rate');

-- Recreate the trigger function with 5% fallback
CREATE OR REPLACE FUNCTION public.crestar_apply_platform_fee() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  rate            numeric;
  goods           numeric;
  creator_gross   numeric;
  seller_gross    numeric;
  deliverer_gross numeric;
BEGIN
  -- Flat 5% is the only rate Crestar charges anywhere. No subscriptions.
  rate := COALESCE(NULLIF(NEW.platform_fee_rate, 0), 0.05);
  NEW.platform_fee_rate := rate;

  -- Goods / creator / seller legs — netted exactly once, at insert.
  IF COALESCE(NEW.fees_netted, false) = false THEN
    goods := COALESCE(
      NEW.subtotal,
      GREATEST(COALESCE(NEW.total_amount, 0) - COALESCE(NEW.delivery_fee, 0), 0)
    );
    IF goods < 0 THEN goods := 0; END IF;

    creator_gross := GREATEST(COALESCE(NEW.creator_commission, 0), 0);
    IF creator_gross > goods THEN creator_gross := goods; END IF;
    seller_gross := GREATEST(goods - creator_gross, 0);

    NEW.creator_commission := ROUND(creator_gross * (1 - rate), 2);
    NEW.seller_payout      := ROUND(seller_gross  * (1 - rate), 2);
    NEW.platform_fee       := ROUND(goods * rate, 2);
    NEW.fees_netted        := true;
  END IF;

  -- Deliverer leg — usually attached after insert (auto-assignment), so it
  -- carries its own one-shot guard.
  IF COALESCE(NEW.deliverer_fee_netted, false) = false
     AND COALESCE(NEW.deliverer_fee, 0) > 0 THEN
    deliverer_gross          := NEW.deliverer_fee;
    NEW.deliverer_fee        := ROUND(deliverer_gross * (1 - rate), 2);
    NEW.platform_fee         := ROUND(COALESCE(NEW.platform_fee, 0) + deliverer_gross * rate, 2);
    NEW.deliverer_fee_netted := true;
  END IF;

  RETURN NEW;
END;
$$;
