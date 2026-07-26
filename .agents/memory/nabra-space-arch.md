---
name: Nabra Space Architecture
description: Key decisions, constraints, and non-obvious rules for the Nabra Space SaaS project
---

## Stack
- Frontend: React + Vite + TailwindCSS + shadcn/ui — `artifacts/nabra-space`
- Backend: Hono + `@hono/node-server` — `artifacts/api-server` (CF Workers compatible in future)
- Database: Supabase (Postgres + Auth + Storage) — JS client only, NOT Replit PostgreSQL/Drizzle
- Payments: Dodo Payments (`dodopayments` npm package, test_mode by default)
- TTS: Gemini 2.5 Flash TTS API → PCM→WAV conversion with DataView/ArrayBuffer (Web API, no native deps)

## Critical Rules (must never be violated)

### Profile integrity
- `credits_balance` and `is_admin` are ONLY written by the DB trigger `handle_new_user` on first signup
- `is_admin=true` only for `youcef20226@gmail.com`
- `PATCH /api/me` must ONLY update `full_name` (whitelist enforced — never credit/admin fields)
- No upsert in application code that touches these fields

### Dodo Payments env vars
- `DODO_PRODUCT_ID_STARTER`, `DODO_PRODUCT_ID_PRO`, `DODO_PRODUCT_ID_AGENCY` must all be set
- If missing, return HTTP 503 with Arabic error message (not silent failure)
- Log full Dodo API response on error, not a generic message

### Affiliate commission
- `commission_expires_at` = `attributed_at + 12 months` (set at attribution time, not first purchase)
- Commissions after expiry date are silently skipped
- Pending balance → available balance transfer: after 10 days from `first_paid_conversion_at`
- Self-referral is silently rejected (no error to user)
- `GET /affiliate/stats` must create the affiliate row if missing (safety net for old users)

### Prices
- USD only — never DZD anywhere in code, UI, or API

### Error handling
- Every API route inside try/catch, always returns JSON
- External calls (Gemini, Dodo) must log full error text on failure
- `GET /affiliate/stats` must never 404 — creates row if needed

### Audio generation
- Single Gemini API call, all blocks combined: "[Tone]\ntext" per block, joined with newline
- Gemini model: `gemini-2.5-flash-preview-tts:generateContent`
- PCM → WAV: manual RIFF header with DataView (no native audio libs)
- Credits deducted AFTER successful storage upload (not before)
- Status flow: processing → completed | failed

## OAuth redirect
- Use `VITE_FRONTEND_URL` env var for `redirectTo` in `signInWithOAuth`
- Falls back to `window.location.origin` if not set
- `FRONTEND_URL` backend env → exposed to frontend as `VITE_FRONTEND_URL` in vite.config.ts

## Key files
- `supabase/schema.sql` — full schema + RPC functions + trigger + RLS policies + storage bucket
- `supabase/migration_commission_expires.sql` — migration for existing DBs (adds commission_expires_at)
- `plan.txt` — project-level architecture summary
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for generated client)
- `lib/api-client-react/` — generated React Query hooks (regenerate with codegen after openapi.yaml changes)

**Why:** These constraints came directly from user-provided spec files and were confirmed as blocking issues. Violating them breaks admin access, causes data loss, or makes payments silent-fail.
