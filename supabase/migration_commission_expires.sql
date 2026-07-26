-- Migration: add commission_expires_at to referral_attributions
-- Run this if the table already exists without this column

ALTER TABLE public.referral_attributions
  ADD COLUMN IF NOT EXISTS commission_expires_at TIMESTAMPTZ;

-- Backfill existing rows: 12 months from attributed_at
UPDATE public.referral_attributions
SET commission_expires_at = attributed_at + INTERVAL '12 months'
WHERE commission_expires_at IS NULL;
