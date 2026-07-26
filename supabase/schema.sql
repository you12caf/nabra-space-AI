-- ============================================================
-- Nabra Space — Supabase Schema (Full)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users_profile (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  is_admin        BOOLEAN NOT NULL DEFAULT false,
  is_banned       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generation_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_input      TEXT,
  character_count INTEGER,
  blocks_json     JSONB,
  audio_url       TEXT,
  status          TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'completed', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd        NUMERIC(10,2) NOT NULL,
  characters_granted INTEGER,
  dodo_payment_id   TEXT,
  package_id        TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliates (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code     TEXT UNIQUE NOT NULL,
  commission_rate   NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  total_clicks      INTEGER NOT NULL DEFAULT 0,
  total_signups     INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  pending_balance   NUMERIC(10,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attributed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_paid_conversion_at TIMESTAMPTZ,
  commission_expires_at    TIMESTAMPTZ  -- 12 months from attributed_at, set at insert time
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT UNIQUE NOT NULL,
  characters_granted  INTEGER NOT NULL,
  max_total_uses      INTEGER NOT NULL,
  max_uses_per_user   INTEGER NOT NULL DEFAULT 1,
  current_uses        INTEGER NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ,
  linked_affiliate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gen_history_user ON public.generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attr_affiliate ON public.referral_attributions(affiliate_user_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON public.promo_code_redemptions(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_user ON public.affiliate_payouts(affiliate_user_id);

-- ────────────────────────────────────────────────────────────
-- 3. HELPER FUNCTIONS (called from backend via rpc)
-- ────────────────────────────────────────────────────────────

-- Deduct credits atomically
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users_profile
  SET credits_balance = credits_balance - p_amount
  WHERE user_id = p_user_id AND credits_balance >= p_amount;
  RETURN FOUND;
END;
$$;

-- Add credits atomically
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE new_balance INTEGER;
BEGIN
  UPDATE public.users_profile
  SET credits_balance = credits_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO new_balance;
  RETURN COALESCE(new_balance, 0);
END;
$$;

-- Redeem promo code atomically (transaction to prevent race conditions)
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_characters INTEGER
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Lock the promo code row
  PERFORM 1 FROM public.promo_codes
  WHERE id = p_promo_code_id
  FOR UPDATE;

  -- Increment usage
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = p_promo_code_id;

  -- Record redemption
  INSERT INTO public.promo_code_redemptions (promo_code_id, user_id)
  VALUES (p_promo_code_id, p_user_id);

  -- Add credits
  UPDATE public.users_profile
  SET credits_balance = credits_balance + p_characters
  WHERE user_id = p_user_id
  RETURNING credits_balance INTO new_balance;

  RETURN jsonb_build_object('new_balance', COALESCE(new_balance, 0));
END;
$$;

-- Increment affiliate clicks
CREATE OR REPLACE FUNCTION public.increment_affiliate_clicks(p_referral_code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliates
  SET total_clicks = total_clicks + 1
  WHERE referral_code = p_referral_code;
END;
$$;

-- Increment affiliate signups
CREATE OR REPLACE FUNCTION public.increment_affiliate_signups(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliates
  SET total_signups = total_signups + 1
  WHERE user_id = p_user_id;
END;
$$;

-- Increment affiliate conversions
CREATE OR REPLACE FUNCTION public.increment_affiliate_conversions(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliates
  SET total_conversions = total_conversions + 1
  WHERE user_id = p_user_id;
END;
$$;

-- Add pending commission to affiliate
CREATE OR REPLACE FUNCTION public.add_pending_commission(p_affiliate_user_id UUID, p_amount NUMERIC)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.affiliates
  SET pending_balance = pending_balance + p_amount
  WHERE user_id = p_affiliate_user_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE PROFILE TRIGGER
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_admin   BOOLEAN;
  _ref_code   TEXT;
  _full_name  TEXT;
  _avatar_url TEXT;
BEGIN
  _is_admin   := (NEW.email = 'youcef20226@gmail.com');
  _full_name  := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
  _avatar_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '');

  LOOP
    _ref_code := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.affiliates WHERE referral_code = _ref_code);
  END LOOP;

  INSERT INTO public.users_profile (user_id, email, full_name, avatar_url, credits_balance, is_admin)
  VALUES (NEW.id, NEW.email, _full_name, _avatar_url, 500, _is_admin)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.affiliates (user_id, referral_code)
  VALUES (NEW.id, _ref_code)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users_profile WHERE user_id = auth.uid()), false
  );
$$;

-- users_profile
DROP POLICY IF EXISTS "up_select" ON public.users_profile;
CREATE POLICY "up_select" ON public.users_profile FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "up_update" ON public.users_profile;
CREATE POLICY "up_update" ON public.users_profile FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "up_insert" ON public.users_profile;
CREATE POLICY "up_insert" ON public.users_profile FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- generation_history
DROP POLICY IF EXISTS "gh_select" ON public.generation_history;
CREATE POLICY "gh_select" ON public.generation_history FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "gh_insert" ON public.generation_history;
CREATE POLICY "gh_insert" ON public.generation_history FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "gh_update" ON public.generation_history;
CREATE POLICY "gh_update" ON public.generation_history FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- transactions
DROP POLICY IF EXISTS "tx_select" ON public.transactions;
CREATE POLICY "tx_select" ON public.transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "tx_insert" ON public.transactions;
CREATE POLICY "tx_insert" ON public.transactions FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "tx_update" ON public.transactions;
CREATE POLICY "tx_update" ON public.transactions FOR UPDATE
  USING (true);

-- affiliates
DROP POLICY IF EXISTS "af_select" ON public.affiliates;
CREATE POLICY "af_select" ON public.affiliates FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "af_update" ON public.affiliates;
CREATE POLICY "af_update" ON public.affiliates FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin());

-- referral_attributions
DROP POLICY IF EXISTS "ra_select" ON public.referral_attributions;
CREATE POLICY "ra_select" ON public.referral_attributions FOR SELECT
  USING (referred_user_id = auth.uid() OR affiliate_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "ra_insert" ON public.referral_attributions;
CREATE POLICY "ra_insert" ON public.referral_attributions FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "ra_update" ON public.referral_attributions;
CREATE POLICY "ra_update" ON public.referral_attributions FOR UPDATE
  USING (true);

-- promo_codes
DROP POLICY IF EXISTS "pc_select" ON public.promo_codes;
CREATE POLICY "pc_select" ON public.promo_codes FOR SELECT USING (true);
DROP POLICY IF EXISTS "pc_admin_all" ON public.promo_codes;
CREATE POLICY "pc_admin_all" ON public.promo_codes FOR ALL USING (public.is_admin());

-- promo_code_redemptions
DROP POLICY IF EXISTS "pcr_select" ON public.promo_code_redemptions;
CREATE POLICY "pcr_select" ON public.promo_code_redemptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "pcr_insert" ON public.promo_code_redemptions;
CREATE POLICY "pcr_insert" ON public.promo_code_redemptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- affiliate_payouts
DROP POLICY IF EXISTS "ap_select" ON public.affiliate_payouts;
CREATE POLICY "ap_select" ON public.affiliate_payouts FOR SELECT
  USING (affiliate_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "ap_insert" ON public.affiliate_payouts;
CREATE POLICY "ap_insert" ON public.affiliate_payouts FOR INSERT
  WITH CHECK (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- 6. STORAGE BUCKET
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-audio', 'generated-audio', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "audio_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'generated-audio' AND auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS "audio_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-audio' AND auth.role() = 'authenticated');
