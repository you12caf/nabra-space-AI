import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app.js";
import { getSupabaseAdmin, verifySupabaseToken } from "./supabase.js";

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "غير مصرح — يلزم تسجيل الدخول" }, 401);
  }
  const token = authHeader.slice(7);
  const user = await verifySupabaseToken(token);
  if (!user) {
    return c.json({ error: "الجلسة منتهية — يرجى تسجيل الدخول مجدداً" }, 401);
  }

  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase
    .from("users_profile")
    .select("is_admin, is_banned")
    .eq("user_id", user.id)
    .single();

  if (profile?.is_banned) {
    return c.json({ error: "تم حظر هذا الحساب" }, 403);
  }

  c.set("userId", user.id);
  c.set("userEmail", user.email ?? "");
  c.set("isAdmin", profile?.is_admin ?? false);
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("isAdmin")) {
    return c.json({ error: "غير مسموح — يلزم صلاحيات المدير" }, 403);
  }
  await next();
});
