import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonRecord = Record<string, unknown>;
type SupabaseQueryClient = {
  from: (table: string) => any;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function normalize(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
  return text || null;
}

function normalizeEmail(value: unknown): string | null {
  return normalize(value, 320)?.toLowerCase() ?? null;
}

function asInteger(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asIsoDate(value: unknown): string | null {
  const text = normalize(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSHA256(secret: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function verifySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSHA256(secret, rawBody);
  return timingSafeEqual(expected, signature);
}

async function emailHash(email: string, salt: string): Promise<string> {
  return hmacSHA256(salt, email);
}

async function findTrialSignupId(
  supabase: SupabaseQueryClient,
  email: string | null,
  purchaseCreatedAt: string | null,
): Promise<string | null> {
  if (!email) return null;

  let query = supabase
    .from("trial_signups")
    .select("id")
    .eq("email_normalized", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (purchaseCreatedAt) {
    query = query.lte("created_at", purchaseCreatedAt);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("Trial lookup failed", error);
    return null;
  }
  const rows = data as Array<{ id?: string }> | null;
  return rows?.[0]?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("LEMON_WEBHOOK_SECRET");
  const emailHashSalt = Deno.env.get("LEMON_EMAIL_HASH_SALT") ?? webhookSecret;

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret || !emailHashSalt) {
    return json({ error: { code: "service_unconfigured" } }, 503);
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature");
  const isValid = await verifySignature(rawBody, signature, webhookSecret);
  if (!isValid) {
    return json({ error: { code: "invalid_signature" } }, 401);
  }

  let payload: JsonRecord;
  try {
    payload = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return json({ error: { code: "bad_json" } }, 400);
  }

  const meta = asRecord(payload.meta);
  const data = asRecord(payload.data);
  const attributes = asRecord(data.attributes);
  const customData = asRecord(meta.custom_data);
  const eventName = normalize(req.headers.get("X-Event-Name") ?? meta.event_name, 80);

  if (eventName !== "order_created") {
    return json({ ok: true, ignored: true, event_name: eventName });
  }

  const lemonOrderId = normalize(data.id, 80);
  if (!lemonOrderId) {
    return json({ error: { code: "missing_order_id" } }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const normalizedEmail = normalizeEmail(attributes.user_email);
  const lemonCreatedAt = asIsoDate(attributes.created_at);
  const trialSignupId = await findTrialSignupId(supabase, normalizedEmail, lemonCreatedAt);
  const conversionPath = trialSignupId ? "trial_led" : "direct";
  const hashedEmail = normalizedEmail
    ? await emailHash(normalizedEmail, emailHashSalt)
    : null;

  const row = {
    lemon_order_id: lemonOrderId,
    lemon_identifier: normalize(attributes.identifier, 120),
    lemon_order_number: normalize(attributes.order_number, 80),
    lemon_store_id: normalize(attributes.store_id, 80),
    lemon_customer_id: normalize(attributes.customer_id, 80),
    customer_email_hash: hashedEmail,
    amount_total: asInteger(attributes.total),
    amount_usd: asInteger(attributes.total_usd),
    currency: normalize(attributes.currency, 12),
    status: normalize(attributes.status, 80),
    refunded: asBoolean(attributes.refunded),
    lemon_created_at: lemonCreatedAt,
    event_name: "order_created",
    conversion_path: conversionPath,
    trial_signup_id: trialSignupId,
    session_id: normalize(customData.session_id, 160),
    utm_source: normalize(customData.utm_source, 160),
    utm_medium: normalize(customData.utm_medium, 160),
    utm_campaign: normalize(customData.utm_campaign, 160),
    referrer_host: normalize(customData.referrer_host, 255),
    landing_path: normalize(customData.landing_path, 1000),
    current_path: normalize(customData.current_path, 1000),
    custom_data: customData,
    raw_event: payload,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("lemon_orders")
    .upsert(row, { onConflict: "lemon_order_id" });

  if (error) {
    console.error("Lemon order upsert failed", error);
    return json({ error: { code: "insert_failed" } }, 500);
  }

  return json({
    ok: true,
    order_id: lemonOrderId,
    conversion_path: conversionPath,
  });
});
