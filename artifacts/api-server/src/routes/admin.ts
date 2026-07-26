import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// All admin routes require auth + admin role
app.use("/*", requireAuth, requireAdmin);

// ─── GET /api/admin/overview ────────────────────────────────────────────────
app.get("/overview", async (c) => {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: lastWeekUsers },
    { data: revenueAll },
    { data: revenueMonth },
    { data: charStats },
    { data: genStats },
    { data: recentTxns },
    { data: topAffiliates },
    { data: profileDates },
  ] = await Promise.all([
    supabase.from("users_profile").select("user_id", { count: "exact", head: true }),
    supabase
      .from("users_profile")
      .select("user_id", { count: "exact", head: true })
      .lt("created_at", oneWeekAgo),
    supabase
      .from("transactions")
      .select("amount_usd")
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount_usd")
      .eq("status", "completed")
      .gte("created_at", startOfMonth),
    supabase
      .from("generation_history")
      .select("character_count")
      .eq("status", "completed"),
    supabase
      .from("generation_history")
      .select("status"),
    supabase
      .from("transactions")
      .select("id, user_id, amount_usd, characters_granted, dodo_payment_id, status, package_id, created_at, users_profile!inner(email)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("affiliates")
      .select("user_id, referral_code, total_conversions, commission_rate, pending_balance, available_balance, status, users_profile!inner(email)")
      .gte("created_at", startOfMonth)
      .order("total_conversions", { ascending: false })
      .limit(5),
    supabase
      .from("users_profile")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true }),
  ]);

  const total = totalUsers ?? 0;
  const prevWeekTotal = lastWeekUsers ?? 0;
  const thisWeekNew = total - prevWeekTotal;
  const userGrowthPct = prevWeekTotal > 0 ? (thisWeekNew / prevWeekTotal) * 100 : 0;

  const totalRevenue = (revenueAll ?? []).reduce((s, t) => s + Number(t.amount_usd), 0);
  const monthlyRevenue = (revenueMonth ?? []).reduce((s, t) => s + Number(t.amount_usd), 0);
  const totalChars = (charStats ?? []).reduce((s, g) => s + (g.character_count ?? 0), 0);

  const allGens = genStats ?? [];
  const completedGens = allGens.filter((g) => g.status === "completed").length;
  const successRate = allGens.length > 0 ? (completedGens / allGens.length) * 100 : 0;

  // Group registrations by date for growth chart
  const dateMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dateMap[d.toISOString().split("T")[0]] = 0;
  }
  for (const p of profileDates ?? []) {
    const day = p.created_at.split("T")[0];
    if (dateMap[day] !== undefined) dateMap[day]++;
  }
  const userGrowthData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const recentTransactions = (recentTxns ?? []).map((t) => ({
    id: t.id,
    user_id: t.user_id,
    email: (t.users_profile as { email?: string } | null)?.email ?? null,
    amount_usd: t.amount_usd,
    characters_granted: t.characters_granted,
    dodo_payment_id: t.dodo_payment_id,
    status: t.status,
    package_id: t.package_id,
    created_at: t.created_at,
  }));

  const topAffiliatesList = (topAffiliates ?? []).map((a) => ({
    user_id: a.user_id,
    email: (a.users_profile as { email?: string } | null)?.email ?? null,
    referral_code: a.referral_code,
    commission_rate: a.commission_rate,
    total_clicks: 0,
    total_signups: 0,
    total_conversions: a.total_conversions,
    pending_balance: a.pending_balance,
    available_balance: a.available_balance,
    status: a.status,
  }));

  return c.json({
    total_users: total,
    user_growth_pct: Math.round(userGrowthPct * 100) / 100,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    monthly_revenue: Math.round(monthlyRevenue * 100) / 100,
    total_characters_generated: totalChars,
    success_rate: Math.round(successRate * 100) / 100,
    recent_transactions: recentTransactions,
    top_affiliates: topAffiliatesList,
    user_growth_data: userGrowthData,
  });
});

// ─── GET /api/admin/users ────────────────────────────────────────────────────
app.get("/users", async (c) => {
  const supabase = getSupabaseAdmin();
  const search = c.req.query("search") ?? "";

  let query = supabase
    .from("users_profile")
    .select("user_id, email, full_name, avatar_url, created_at, credits_balance, is_admin, is_banned");

  if (search) query = query.ilike("email", `%${search}%`);
  query = query.order("created_at", { ascending: false }).limit(100);

  const { data: users, error } = await query;
  if (error) return c.json({ error: "خطأ في جلب المستخدمين" }, 500);

  // Get generation counts and spending per user
  const userIds = (users ?? []).map((u) => u.user_id);
  const [{ data: genCounts }, { data: spending }] = await Promise.all([
    supabase
      .from("generation_history")
      .select("user_id")
      .in("user_id", userIds)
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("user_id, amount_usd")
      .in("user_id", userIds)
      .eq("status", "completed"),
  ]);

  const genCountMap: Record<string, number> = {};
  const spendingMap: Record<string, number> = {};
  for (const g of genCounts ?? []) {
    genCountMap[g.user_id] = (genCountMap[g.user_id] ?? 0) + 1;
  }
  for (const t of spending ?? []) {
    spendingMap[t.user_id] = (spendingMap[t.user_id] ?? 0) + Number(t.amount_usd);
  }

  return c.json(
    (users ?? []).map((u) => ({
      user_id: u.user_id,
      email: u.email,
      full_name: u.full_name ?? null,
      avatar_url: u.avatar_url ?? null,
      created_at: u.created_at,
      credits_balance: u.credits_balance,
      generation_count: genCountMap[u.user_id] ?? 0,
      total_spent: Math.round((spendingMap[u.user_id] ?? 0) * 100) / 100,
      is_admin: u.is_admin,
      is_banned: u.is_banned ?? false,
    })),
  );
});

// ─── PATCH /api/admin/users/:id/credits ────────────────────────────────────
app.patch("/users/:id/credits", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");

  let body: { type?: "set" | "add" | "subtract"; amount?: number };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const { type, amount } = body;
  if (!type || amount === undefined || amount < 0) {
    return c.json({ error: "نوع العملية والمبلغ مطلوبان" }, 400);
  }

  const { data: current } = await supabase
    .from("users_profile")
    .select("credits_balance")
    .eq("user_id", id)
    .single();

  if (!current) return c.json({ error: "المستخدم غير موجود" }, 404);

  let newBalance: number;
  if (type === "set") newBalance = amount;
  else if (type === "add") newBalance = current.credits_balance + amount;
  else newBalance = Math.max(0, current.credits_balance - amount);

  const { data: updated, error } = await supabase
    .from("users_profile")
    .update({ credits_balance: newBalance })
    .eq("user_id", id)
    .select()
    .single();

  if (error) return c.json({ error: "خطأ في تحديث الرصيد" }, 500);
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

// ─── PATCH /api/admin/users/:id/status ─────────────────────────────────────
app.patch("/users/:id/status", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");

  let body: { is_banned?: boolean };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const { data: updated, error } = await supabase
    .from("users_profile")
    .update({ is_banned: body.is_banned ?? false })
    .eq("user_id", id)
    .select()
    .single();

  if (error) return c.json({ error: "خطأ في تحديث حالة المستخدم" }, 500);
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

// ─── GET /api/admin/transactions ─────────────────────────────────────────────
app.get("/transactions", async (c) => {
  const supabase = getSupabaseAdmin();
  const status = c.req.query("status");

  let query = supabase
    .from("transactions")
    .select("*, users_profile!inner(email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && ["pending", "completed", "failed"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return c.json({ error: "خطأ في جلب المعاملات" }, 500);

  return c.json(
    (data ?? []).map((t) => ({
      id: t.id,
      user_id: t.user_id,
      email: (t.users_profile as { email?: string } | null)?.email ?? null,
      amount_usd: t.amount_usd,
      characters_granted: t.characters_granted,
      dodo_payment_id: t.dodo_payment_id,
      status: t.status,
      package_id: t.package_id,
      created_at: t.created_at,
    })),
  );
});

// ─── Promo Codes ──────────────────────────────────────────────────────────────

app.get("/promo-codes", async (c) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return c.json({ error: "خطأ في جلب الأكواد" }, 500);
  return c.json(data ?? []);
});

app.post("/promo-codes", async (c) => {
  const supabase = getSupabaseAdmin();
  let body: {
    code?: string;
    characters_granted?: number;
    max_total_uses?: number;
    max_uses_per_user?: number;
    expires_at?: string | null;
    linked_affiliate_id?: string | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const { code, characters_granted, max_total_uses } = body;
  if (!code?.trim() || !characters_granted || !max_total_uses) {
    return c.json({ error: "الكود وعدد الحروف والحد الأقصى مطلوبة" }, 400);
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      code: code.trim().toUpperCase(),
      characters_granted: body.characters_granted,
      max_total_uses: body.max_total_uses,
      max_uses_per_user: body.max_uses_per_user ?? 1,
      expires_at: body.expires_at ?? null,
      linked_affiliate_id: body.linked_affiliate_id ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return c.json({ error: "هذا الكود موجود مسبقاً" }, 400);
    return c.json({ error: "خطأ في إنشاء الكود" }, 500);
  }
  return c.json(data, 201);
});

app.patch("/promo-codes/:id", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");
  let body: { is_active?: boolean; characters_granted?: number; max_total_uses?: number; expires_at?: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.characters_granted !== undefined) updates.characters_granted = body.characters_granted;
  if (body.max_total_uses !== undefined) updates.max_total_uses = body.max_total_uses;
  if (body.expires_at !== undefined) updates.expires_at = body.expires_at;

  const { data, error } = await supabase
    .from("promo_codes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return c.json({ error: "خطأ في تحديث الكود" }, 500);
  return c.json(data);
});

app.delete("/promo-codes/:id", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) return c.json({ error: "خطأ في حذف الكود" }, 500);
  return c.json({ success: true });
});

// ─── Affiliates ───────────────────────────────────────────────────────────────

app.get("/affiliates", async (c) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .select("*, users_profile!inner(email)")
    .order("total_conversions", { ascending: false });
  if (error) return c.json({ error: "خطأ في جلب المسوقين" }, 500);

  return c.json(
    (data ?? []).map((a) => ({
      user_id: a.user_id,
      email: (a.users_profile as { email?: string } | null)?.email ?? null,
      referral_code: a.referral_code,
      commission_rate: a.commission_rate,
      total_clicks: a.total_clicks,
      total_signups: a.total_signups,
      total_conversions: a.total_conversions,
      pending_balance: a.pending_balance,
      available_balance: a.available_balance,
      status: a.status,
    })),
  );
});

app.patch("/affiliates/:id", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");
  let body: { commission_rate?: number; status?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate;
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await supabase
    .from("affiliates")
    .update(updates)
    .eq("user_id", id)
    .select("*, users_profile!inner(email)")
    .single();
  if (error) return c.json({ error: "خطأ في تحديث بيانات المسوّق" }, 500);

  return c.json({
    user_id: data.user_id,
    email: (data.users_profile as { email?: string } | null)?.email ?? null,
    referral_code: data.referral_code,
    commission_rate: data.commission_rate,
    total_clicks: data.total_clicks,
    total_signups: data.total_signups,
    total_conversions: data.total_conversions,
    pending_balance: data.pending_balance,
    available_balance: data.available_balance,
    status: data.status,
  });
});

app.post("/affiliates/:id/payout", async (c) => {
  const supabase = getSupabaseAdmin();
  const id = c.req.param("id");
  let body: { amount?: number; note?: string | null };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  if (!body.amount || body.amount <= 0) {
    return c.json({ error: "المبلغ مطلوب" }, 400);
  }

  // Get current balance
  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("available_balance")
    .eq("user_id", id)
    .single();

  if (!affiliate) return c.json({ error: "المسوّق غير موجود" }, 404);

  // Zero out available_balance
  await supabase
    .from("affiliates")
    .update({ available_balance: 0 })
    .eq("user_id", id);

  // Record payout
  const { data: payout, error } = await supabase
    .from("affiliate_payouts")
    .insert({
      affiliate_user_id: id,
      amount: body.amount,
      note: body.note ?? null,
    })
    .select()
    .single();

  if (error) return c.json({ error: "خطأ في تسجيل الدفعة" }, 500);
  return c.json(payout);
});

export default app;
