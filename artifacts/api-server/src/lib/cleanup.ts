import { getSupabaseAdmin } from "./supabase.js";

export async function cleanupExpiredGenerations() {
  const supabase = getSupabaseAdmin();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // اجلب كل التسجيلات الأقدم من 7 أيام
  const { data: expired, error: fetchError } = await supabase
    .from("generation_history")
    .select("id, user_id")
    .lt("created_at", sevenDaysAgo);

  if (fetchError) {
    console.error("[cleanup] Failed to fetch expired generations:", fetchError);
    return;
  }
  if (!expired || expired.length === 0) {
    console.log("[cleanup] No expired generations found.");
    return;
  }

  console.log(`[cleanup] Found ${expired.length} expired generations to delete.`);

  // احذف ملفات الصوت من Storage (دفعة واحدة)
  const filePaths = expired.map((g) => `${g.user_id}/${g.id}.wav`);
  const { error: storageError } = await supabase.storage
    .from("generated-audio")
    .remove(filePaths);
  if (storageError) {
    console.error("[cleanup] Storage deletion error (continuing anyway):", storageError);
  }

  // احذف السطور بالكامل من الجدول
  const idsToDelete = expired.map((g) => g.id);
  const { error: deleteError } = await supabase
    .from("generation_history")
    .delete()
    .in("id", idsToDelete);

  if (deleteError) {
    console.error("[cleanup] Database deletion error:", deleteError);
  } else {
    console.log(`[cleanup] Successfully deleted ${idsToDelete.length} expired generations.`);
  }
}
