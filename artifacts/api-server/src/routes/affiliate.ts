import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// Generate a unique 8-char referral code
async function generateUniqueCode(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const candidate = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data } = await supabase
      .from("affiliates")
      .select("user_id")
      .eq("referral_code", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  // Fallback: use timestamp-based code
  return Date.now().toString(36).toUpperCase().slice(-8);
}

// POST /api/affiliate/click — track affiliate link click (public)
app.post("/click", async (c) => {
  const supabase = getSupabaseAdmin();
  let body: { referral_code?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false }, 400);
  }

  const { referral_code } = body;
  if (!referral_code) return c.json({ success: false }, 400);

  await supabase.rpc("increment_affiliate_clicks", { p_referral_code: referral_code });
  return c.json({ success: true });
});

// POST /api/affiliate/attribute — attribute referral on first signup
app.post("/attribute", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  let body: { referral_code?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: null }, 400);
  }

  const { referral_code } = body;
  if (!referral_code) return c.json({ success: false, message: "كود الإحالة مطلوب" });

  // Find affiliate by referral code
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("user_id")
    .eq("referral_code", referral_code)
    .single();

  if (!affiliate) {
    return c.json({ success: false, message: "كود الإحالة غير صالح" });
  }

  // Reject self-referral silently
  if (affiliate.user_id === userId) {
    return c.json({ success: true, message: null });
  }

  // Check if user already has an attribution
  const { data: existing } = await supabase
    .from("referral_attributions")
    .select("id")
    .eq("referred_user_id", userId)
    .maybeSingle();

  if (existing) {
    return c.json({ success: true, message: null }); // Already attributed
  }

  // Commission window: 12 months from attribution date
  const commissionExpiresAt = new Date();
  commissionExpiresAt.setFullYear(commissionExpiresAt.getFullYear() + 1);

  // Create attribution
  const { error } = await supabase.from("referral_attributions").insert({
    referred_user_id: userId,
    affiliate_user_id: affiliate.user_id,
    attributed_at: new Date().toISOString(),
    commission_expires_at: commissionExpiresAt.toISOString(),
  });

  if (error) {
    console.error("[affiliate.attribute]", error);
    return c.json({ success: false, message: "خطأ في تسجيل الإحالة" });
  }

  // Increment signups count
  await supabase.rpc("increment_affiliate_signups", { p_user_id: affiliate.user_id });

  return c.json({ success: true, message: null });
});

// GET /api/affiliate/stats — get current user's affiliate stats (creates row if missing)
app.get("/stats", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  let { data: affiliate, error } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  // Create affiliate row if not found (safe fallback for users who signed up before trigger)
  if (!affiliate) {
    const code = await generateUniqueCode(supabase);
    const { data: created, error: createError } = await supabase
      .from("affiliates")
      .insert({ user_id: userId, referral_code: code })
      .select()
      .single();

    if (createError || !created) {
      console.error("[affiliate.stats] Failed to create affiliate row:", createError);
      return c.json({ error: "خطأ في جلب بيانات الإحالة" }, 500);
    }
    affiliate = created;
  }

  // Move pending to available if commissions are > 10 days old
  if (affiliate.pending_balance > 0) {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const { data: oldConversions } = await supabase
      .from("referral_attributions")
      .select("id")
      .eq("affiliate_user_id", userId)
      .not("first_paid_conversion_at", "is", null)
      .lt("first_paid_conversion_at", tenDaysAgo);

    if (oldConversions && oldConversions.length > 0) {
      const newAvailable = affiliate.available_balance + affiliate.pending_balance;
      const { data: updated } = await supabase
        .from("affiliates")
        .update({ available_balance: newAvailable, pending_balance: 0 })
        .eq("user_id", userId)
        .select()
        .single();

      if (updated) {
        affiliate.available_balance = updated.available_balance;
        affiliate.pending_balance = updated.pending_balance;
      }
    }
  }

  return c.json({
    user_id: affiliate.user_id,
    referral_code: affiliate.referral_code,
    commission_rate: Number(affiliate.commission_rate) * 100, // Convert 0.15 → 15 for display
    total_clicks: affiliate.total_clicks,
    total_signups: affiliate.total_signups,
    total_conversions: affiliate.total_conversions,
    pending_balance: Number(affiliate.pending_balance),
    available_balance: Number(affiliate.available_balance),
    status: affiliate.status,
  });
});

export default app;
