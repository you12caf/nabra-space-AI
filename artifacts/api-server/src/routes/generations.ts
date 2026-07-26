import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// GET /api/generations — list user history
app.get("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("generation_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return c.json({ error: "خطأ في جلب السجلات" }, 500);
  return c.json(data ?? []);
});

// GET /api/generations/:id — get single generation (for polling)
app.get("/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const supabase = getSupabaseAdmin();

  const { data: gen, error } = await supabase
    .from("generation_history")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !gen) return c.json({ error: "التوليد غير موجود" }, 404);

  // Only owner or admin can view
  const isAdmin = c.get("isAdmin");
  if (gen.user_id !== userId && !isAdmin) {
    return c.json({ error: "غير مسموح" }, 403);
  }

  // Refresh signed URL if completed and URL might be expiring
  if (gen.status === "completed" && gen.audio_url) {
    const filePath = `${gen.user_id}/${gen.id}.wav`;
    const { data: urlData } = await supabase.storage
      .from("generated-audio")
      .createSignedUrl(filePath, 7 * 24 * 60 * 60);
    if (urlData?.signedUrl) {
      gen.audio_url = urlData.signedUrl;
      // Update stored URL
      await supabase
        .from("generation_history")
        .update({ audio_url: urlData.signedUrl })
        .eq("id", id);
    }
  }

  return c.json(gen);
});

// GET /api/generations/:id/stream — redirect to signed audio URL
app.get("/:id/stream", requireAuth, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const supabase = getSupabaseAdmin();

  const { data: gen, error } = await supabase
    .from("generation_history")
    .select("status, user_id, audio_url")
    .eq("id", id)
    .single();

  if (error || !gen) return c.json({ error: "التوليد غير موجود" }, 404);
  if (gen.user_id !== userId && !c.get("isAdmin")) {
    return c.json({ error: "غير مسموح" }, 403);
  }
  if (gen.status !== "completed") {
    return c.json({ error: "الصوت غير جاهز بعد" }, 400);
  }

  const filePath = `${gen.user_id}/${id}.wav`;
  const { data: urlData } = await supabase.storage
    .from("generated-audio")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (!urlData?.signedUrl) {
    return c.json({ error: "خطأ في الوصول للملف الصوتي" }, 500);
  }

  return c.redirect(urlData.signedUrl);
});

export default app;
