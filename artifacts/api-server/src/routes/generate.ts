import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";

const app = new Hono<AppEnv>();

// ─── PCM → WAV (Web API, CF Workers compatible) ──────────────────────────────
function pcmToWav(pcmData: Uint8Array, sampleRate: number): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function ws(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  ws(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  ws(8, "WAVE");
  ws(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  ws(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer).set(pcmData, 44);
  return new Uint8Array(buffer);
}

// ─── Background generation processor ─────────────────────────────────────────
async function processGeneration(
  genId: string,
  userId: string,
  blocks: Array<{ tone: string; text: string }>,
  characterCount: number,
) {
  const supabase = getSupabaseAdmin();
  let GEMINI_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_KEY) {
    try {
      const fs = require('fs');
      const path = require('path');
      const envPath = path.resolve(__dirname, '../../.env');
      const altEnvPath = path.resolve(__dirname, '../.env'); // Because dist is one level down
      const finalPath = fs.existsSync(altEnvPath) ? altEnvPath : envPath;
      const env = fs.readFileSync(finalPath, 'utf-8');
      const match = env.match(/GEMINI_API_KEY\s*=\s*(.+)/);
      if (match) GEMINI_KEY = match[1].trim();
    } catch(e) {
      console.error("[generate] fallback env read failed:", e);
    }
  }
  
  if (GEMINI_KEY) GEMINI_KEY = GEMINI_KEY.trim();
  if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set");

  const systemInstructions = `You are a professional Algerian voice actor.
Environment: A professional closed recording studio, absolute silence, high acoustic isolation, no echoes, production quality that rivals the biggest advertising production companies in Algeria.
Persona: You are a professional Algerian advertisement voice actress, speaking with the confidence and polish of major global brands.
Dialect Lock: You must strictly read and pronounce the text in authentic 100% Algerian Darja (Algerian Dialect) — never Modern Standard Arabic (Fusha), never Tunisian or Moroccan dialect. Naturally use distinctive Algerian words such as: واش، راك، بزاف، كيفاش، درك، هاذي، نتاع، برك. Even if the written text looks close to Modern Standard Arabic in its spelling, you must re-render it in full authentic Algerian Darja pronunciation and vocabulary from the first word to the last, with zero drift toward Fusha at any point.
Emotion Guidelines: You will receive text blocks prefixed with tags in square brackets. These tags can be either fixed emotion names (like [Friendly] or [Excited]) or free-form Arabic delivery instructions (like [يتكلم بسخرية خفيفة]). You must interpret and apply each tag precisely, adapting your voice pitch, speed, and emotional tone instantly based on it.`;

  const blockText = blocks.map((b) => `[${b.tone}]\n${b.text}`).join("\n");
  const fullPrompt = `${systemInstructions}\n\n${blockText}`;

  let audioBase64 = "";
  let mimeType = "audio/L16;rate=24000";

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
                },
              },
            }),
            signal: AbortSignal.timeout(120_000),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[generate] Gemini REST error (${response.status}):`, errText);
          throw new Error(`Gemini TTS error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        const mime = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType;
        if (!audioData) {
          console.error("[generate] No audio data. Full response:", JSON.stringify(data));
          throw new Error("No audio data returned from Gemini");
        }
        audioBase64 = audioData;
        mimeType = mime ?? "audio/L16;rate=24000";
        break;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1500));
    }
  }

  // Parse sample rate from mimeType e.g. "audio/L16;rate=24000"
  const rateMatch = mimeType.match(/rate=(\d+)/);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

  // Convert PCM → WAV
  const pcmBytes = new Uint8Array(Buffer.from(audioBase64, "base64"));
  const wavBytes = pcmToWav(pcmBytes, sampleRate);

  // Upload to Supabase Storage
  const filePath = `${userId}/${genId}.wav`;
  const { error: uploadError } = await supabase.storage
    .from("generated-audio")
    .upload(filePath, wavBytes, { contentType: "audio/wav", upsert: false });
  if (uploadError) throw uploadError;

  // Create a long-lived signed URL (7 days)
  const { data: urlData } = await supabase.storage
    .from("generated-audio")
    .createSignedUrl(filePath, 7 * 24 * 60 * 60);
  const audioUrl = urlData?.signedUrl ?? filePath;

  // Update generation record
  await supabase
    .from("generation_history")
    .update({ audio_url: audioUrl, status: "completed" })
    .eq("id", genId);

  // Deduct credits atomically via RPC
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: characterCount,
  });
  if (deductError) {
    console.error("[generate] Credits deduction error:", deductError);
    // Non-fatal: audio is already uploaded
  }
}

// ─── POST /api/generate ───────────────────────────────────────────────────────
app.post("/", requireAuth, async (c) => {
  const userId = c.get("userId");
  const supabase = getSupabaseAdmin();

  let body: { blocks?: Array<{ tone: string; text: string }> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "البيانات المرسلة غير صالحة" }, 400);
  }

  const { blocks } = body;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return c.json({ error: "يجب إضافة بلوك واحد على الأقل" }, 400);
  }
  if (blocks.some((b) => !b.text?.trim())) {
    return c.json({ error: "جميع البلوكات يجب أن تحتوي على نص" }, 400);
  }

  const characterCount = blocks.reduce((s, b) => s + b.text.length, 0);

  // Check credits
  const { data: profile } = await supabase
    .from("users_profile")
    .select("credits_balance")
    .eq("user_id", userId)
    .single();

  const balance = profile?.credits_balance ?? 0;
  if (balance < characterCount) {
    return c.json(
      {
        error: `رصيدك غير كافٍ (تحتاج ${characterCount} حرف، لديك ${balance})`,
      },
      400,
    );
  }

  const textInput = blocks.map((b) => `[${b.tone}]\n${b.text}`).join("\n");

  // Create generation record
  const { data: gen, error: genError } = await supabase
    .from("generation_history")
    .insert({
      user_id: userId,
      text_input: textInput,
      character_count: characterCount,
      blocks_json: blocks,
      status: "processing",
    })
    .select()
    .single();

  if (genError || !gen) {
    console.error("[generate] DB insert error:", genError);
    return c.json({ error: "خطأ في إنشاء طلب التوليد" }, 500);
  }

  // Run in background (Node.js: event loop continues after response)
  processGeneration(gen.id, userId, blocks, characterCount).catch(async (err) => {
    console.error("[generate] Background processing failed:", err);
    await getSupabaseAdmin()
      .from("generation_history")
      .update({ status: "failed" })
      .eq("id", gen.id);
  });

  return c.json(gen, 201);
});

export default app;
