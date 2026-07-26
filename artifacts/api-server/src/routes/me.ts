import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// GET /api/me
app.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  const { data: profile, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return c.json({ error: "لم يتم العثور على الملف الشخصي" }, 404);
  }

  return c.json({
    user_id: profile.user_id,
    email: profile.email,
    credits_balance: profile.credits_balance,
    is_admin: profile.is_admin,
    is_banned: profile.is_banned ?? false,
    full_name: profile.full_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    created_at: profile.created_at,
  });
});

// PATCH /api/me — update display name only (never touch is_admin or credits_balance)
app.patch("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  let body: { full_name?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  if (body.full_name !== undefined && typeof body.full_name !== "string") {
    return c.json({ error: "الاسم يجب أن يكون نصاً" }, 400);
  }

  // Whitelist — never update is_admin, credits_balance, email via this endpoint
  const updates: Record<string, unknown> = {};
  if (body.full_name !== undefined) updates.full_name = body.full_name.trim();

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "لا توجد تغييرات للحفظ" }, 400);
  }

  const { data: updated, error } = await supabase
    .from("users_profile")
    .update(updates)
    .eq("user_id", userId)
    .select("user_id, email, credits_balance, is_admin, is_banned, full_name, avatar_url, created_at")
    .single();

  if (error || !updated) {
    return c.json({ error: "خطأ في تحديث الملف الشخصي" }, 500);
  }

  return c.json({
    user_id: updated.user_id,
    email: updated.email,
    credits_balance: updated.credits_balance,
    is_admin: updated.is_admin,
    is_banned: updated.is_banned ?? false,
    full_name: updated.full_name ?? null,
    avatar_url: updated.avatar_url ?? null,
    created_at: updated.created_at,
  });
});

export default app;
