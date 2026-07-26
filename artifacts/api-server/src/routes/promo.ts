import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// POST /api/promo-codes/redeem
app.post("/redeem", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  let body: { code?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const { code } = body;
  if (!code?.trim()) {
    return c.json({ error: "يرجى إدخال الكود" }, 400);
  }

  const upperCode = code.trim().toUpperCase();

  // Fetch promo code
  const { data: promo, error: promoError } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", upperCode)
    .single();

  if (promoError || !promo) {
    return c.json({ error: "الكود غير موجود" }, 400);
  }

  if (!promo.is_active) {
    return c.json({ error: "هذا الكود غير نشط" }, 400);
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return c.json({ error: "انتهت صلاحية هذا الكود" }, 400);
  }

  if (promo.current_uses >= promo.max_total_uses) {
    return c.json({ error: "تم استنفاد الحد الأقصى لاستخدام هذا الكود" }, 400);
  }

  // Check per-user usage
  const { count } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promo.id)
    .eq("user_id", userId);

  if ((count ?? 0) >= promo.max_uses_per_user) {
    return c.json({ error: "لقد استخدمت هذا الكود بالفعل" }, 400);
  }

  // Execute redemption atomically via RPC
  const { data: result, error: redeemError } = await supabase.rpc("redeem_promo_code", {
    p_promo_code_id: promo.id,
    p_user_id: userId,
    p_characters: promo.characters_granted,
  });

  if (redeemError) {
    console.error("[promo.redeem] RPC error:", redeemError);
    return c.json({ error: "خطأ في معالجة الكود — يرجى المحاولة مجدداً" }, 500);
  }

  const newBalance = (result as { new_balance?: number })?.new_balance ?? 0;

  // Handle linked affiliate (if promo is linked to an affiliate)
  if (promo.linked_affiliate_id) {
    // Trigger attribution if user isn't already attributed
    const { data: existingAttribution } = await supabase
      .from("referral_attributions")
      .select("id")
      .eq("referred_user_id", userId)
      .single();

    if (!existingAttribution) {
      await supabase.from("referral_attributions").insert({
        referred_user_id: userId,
        affiliate_user_id: promo.linked_affiliate_id,
        attributed_at: new Date().toISOString(),
      });
      await supabase.rpc("increment_affiliate_signups", {
        p_user_id: promo.linked_affiliate_id,
      });
    }
  }

  return c.json({
    success: true,
    characters_granted: promo.characters_granted,
    new_balance: newBalance,
    message: `تمت إضافة ${promo.characters_granted} حرف لرصيدك!`,
  });
});

export default app;
