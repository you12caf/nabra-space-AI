import { Hono } from "hono";
import { createHmac } from "node:crypto";
import type { AppEnv } from "../app.js";
import { requireAuth } from "../lib/auth.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import DodoPayments from "dodopayments";

const PACKAGES = {
  starter: { amountUsd: 1.0, characters: 6000, name: "الانطلاقة" },
  pro: { amountUsd: 5.0, characters: 40000, name: "المحترف" },
  agency: { amountUsd: 10.0, characters: 100000, name: "المتجر / الوكالة" },
} as const;

type PackageId = keyof typeof PACKAGES;

function getDodoClient() {
  const key = process.env.DODO_API_KEY;
  if (!key) throw new Error("DODO_API_KEY غير مُعدّ");
  return new DodoPayments({
    bearerToken: key,
    environment: process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
  });
}

const app = new Hono<AppEnv>();

// POST /api/payments/checkout
app.post("/checkout", requireAuth, async (c) => {
  const userId = c.get("userId");
  const userEmail = c.get("userEmail");
  const supabase = getSupabaseAdmin();

  // Verify Dodo API key is present
  if (!process.env.DODO_API_KEY) {
    return c.json({ error: "بوابة الدفع غير مُعدّة بعد — يرجى التواصل مع الدعم" }, 503);
  }

  let body: { package_id?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "بيانات غير صالحة" }, 400);
  }

  const packageId = body.package_id as PackageId;
  if (!packageId || !PACKAGES[packageId]) {
    return c.json({ error: "باقة غير صالحة (starter/pro/agency)" }, 400);
  }

  const pkg = PACKAGES[packageId];
  const productEnvKey = `DODO_PRODUCT_ID_${packageId.toUpperCase()}`;
  const productId = process.env[productEnvKey];

  // Create pending transaction
  const { data: txn, error: txnError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      amount_usd: pkg.amountUsd,
      characters_granted: pkg.characters,
      package_id: packageId,
      status: "pending",
    })
    .select()
    .single();

  if (txnError || !txn) {
    console.error("[payments/checkout] Transaction insert error:", txnError);
    return c.json({ error: "خطأ في إنشاء المعاملة" }, 500);
  }

  // Check product ID
  if (!productId) {
    console.warn(`[payments/checkout] ${productEnvKey} not set in environment`);
    await supabase.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return c.json({ error: "بوابة الدفع غير مُعدّة بعد — لم يتم تعيين معرف المنتج" }, 503);
  }

  try {
    const dodo = getDodoClient();
    const origin =
      process.env.FRONTEND_URL ||
      c.req.header("origin") ||
      process.env.SITE_URL ||
      "https://nabra.space";
    const returnUrl = `${origin}/pricing?payment=success&txn=${txn.id}`;

    const payment = await dodo.payments.create({
      billing: {
        city: "Algiers",
        country: "DZ",
        state: "Algiers",
        street: "",
        zipcode: "16000",
      },
      customer: { email: userEmail, name: userEmail },
      product_cart: [{ product_id: productId, quantity: 1 }],
      payment_link: true,
      return_url: returnUrl,
      metadata: {
        transaction_id: txn.id,
        user_id: userId,
        package_id: packageId,
        characters: String(pkg.characters),
      },
    } as Parameters<typeof dodo.payments.create>[0]);

    const checkoutUrl = (payment as { payment_link?: string }).payment_link;
    if (!checkoutUrl) {
      const errMsg = JSON.stringify(payment);
      console.error("[payments/checkout] Dodo returned no payment_link:", errMsg);
      throw new Error(`Dodo payment_link missing. Response: ${errMsg}`);
    }

    const dodoPaymentId = (payment as { payment_id?: string }).payment_id;
    await supabase
      .from("transactions")
      .update({ dodo_payment_id: dodoPaymentId })
      .eq("id", txn.id);

    return c.json({ url: checkoutUrl });
  } catch (err: unknown) {
    // Log the full Dodo error for debugging
    const errDetails =
      err instanceof Error
        ? `${err.message}\n${err.stack}`
        : JSON.stringify(err);
    console.error("[payments/checkout] Dodo API error:", errDetails);
    await supabase.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return c.json(
      { error: "خطأ في إنشاء رابط الدفع — يرجى المحاولة لاحقاً" },
      500,
    );
  }
});

// POST /api/payments/webhook — raw body, HMAC-SHA256 verification
app.post("/webhook", async (c) => {
  const rawBody = await c.req.text();
  const supabase = getSupabaseAdmin();

  const webhookSecret = process.env.DODO_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] DODO_WEBHOOK_SECRET not set");
    return c.json({ error: "Webhook secret not configured" }, 500);
  }

  // Verify signature (Dodo sends sha256=<hex> or raw hex)
  const sigHeader =
    c.req.header("webhook-signature") ||
    c.req.header("dodo-signature") ||
    c.req.header("x-dodo-signature") ||
    "";

  if (sigHeader) {
    const expectedSig = createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    const receivedSig = sigHeader.replace(/^sha256=/, "");
    if (receivedSig !== expectedSig) {
      console.error("[webhook] Signature mismatch. Received:", receivedSig, "Expected:", expectedSig);
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  let event: {
    type?: string;
    data?: {
      payment_id?: string;
      status?: string;
      metadata?: {
        transaction_id?: string;
        user_id?: string;
        package_id?: string;
        characters?: string;
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const eventType = event.type ?? "";
  const data = event.data ?? {};
  const metadata = data.metadata ?? {};

  console.log("[webhook] Event:", eventType, "| payment:", data.payment_id, "| status:", data.status);

  const isSuccess =
    eventType === "payment.succeeded" ||
    eventType === "payment.completed" ||
    data.status === "succeeded" ||
    data.status === "completed";

  const isFailure = eventType === "payment.failed" || data.status === "failed";

  if (isSuccess) {
    const txnId = metadata.transaction_id;
    const userId = metadata.user_id;
    const characters = parseInt(metadata.characters ?? "0", 10);
    const packageId = metadata.package_id;

    if (!txnId || !userId || characters <= 0) {
      console.error("[webhook] Missing required metadata:", JSON.stringify(metadata));
      return c.json({ received: true });
    }

    // Idempotency check
    const { data: existing } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", txnId)
      .single();

    if (existing?.status === "completed") {
      console.log("[webhook] Already processed:", txnId);
      return c.json({ received: true });
    }

    // Update transaction
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        dodo_payment_id: data.payment_id,
        characters_granted: characters,
        package_id: packageId,
      })
      .eq("id", txnId);

    // Add credits atomically
    const { error: creditError } = await supabase.rpc("add_credits", {
      p_user_id: userId,
      p_amount: characters,
    });
    if (creditError) {
      console.error("[webhook] add_credits RPC error:", creditError);
    } else {
      console.log("[webhook] Added", characters, "credits to user:", userId);
    }

    // Process affiliate commission (respects 12-month window)
    await processAffiliateCommission(userId, PACKAGES[packageId as PackageId]?.amountUsd ?? 0, supabase);
  } else if (isFailure) {
    const txnId = metadata.transaction_id;
    if (txnId) {
      await supabase
        .from("transactions")
        .update({ status: "failed", dodo_payment_id: data.payment_id })
        .eq("id", txnId);
    }
  }

  return c.json({ received: true });
});

async function processAffiliateCommission(
  userId: string,
  amountUsd: number,
  supabase: ReturnType<typeof getSupabaseAdmin>,
) {
  try {
    const { data: attribution } = await supabase
      .from("referral_attributions")
      .select("affiliate_user_id, first_paid_conversion_at, commission_expires_at")
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (!attribution) return; // Not referred

    // Check 12-month commission window
    if (
      attribution.commission_expires_at &&
      new Date(attribution.commission_expires_at) < new Date()
    ) {
      console.log("[affiliate] Commission window expired for user:", userId);
      return;
    }

    const { data: affiliate } = await supabase
      .from("affiliates")
      .select("commission_rate, status")
      .eq("user_id", attribution.affiliate_user_id)
      .maybeSingle();

    if (!affiliate || affiliate.status !== "active") return;

    const commission = amountUsd * Number(affiliate.commission_rate);
    const isFirstConversion = !attribution.first_paid_conversion_at;

    await supabase.rpc("add_pending_commission", {
      p_affiliate_user_id: attribution.affiliate_user_id,
      p_amount: commission,
    });

    if (isFirstConversion) {
      await supabase
        .from("referral_attributions")
        .update({ first_paid_conversion_at: new Date().toISOString() })
        .eq("referred_user_id", userId);

      await supabase.rpc("increment_affiliate_conversions", {
        p_user_id: attribution.affiliate_user_id,
      });
    }

    console.log("[affiliate] Commission", commission.toFixed(4), "USD added for affiliate:", attribution.affiliate_user_id);
  } catch (err) {
    console.error("[affiliate commission] Error:", err);
  }
}

export default app;
