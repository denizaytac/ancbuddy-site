import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORDER_IDENTIFIER_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = new Set([
  "google",
  "chatgpt_ai",
  "github",
  "reddit_forum",
  "listing",
  "recommendation",
  "social_video",
  "other",
  "unknown",
]);
const MAX_BODY_BYTES = 1024;
const RETRY_DELAYS_MS = [0, 250, 750, 1500];

function allowedOrigin(origin: string | null): string | null {
  if (
    origin === "https://ancbuddy.com" ||
    origin === "https://www.ancbuddy.com" ||
    (origin && /^https?:\/\/(localhost|127[.]0[.]0[.]1)(:\d+)?$/.test(origin))
  ) {
    return origin;
  }
  return null;
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

function normalize(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
  return text || null;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

Deno.serve(async (req) => {
  const origin = allowedOrigin(req.headers.get("Origin"));
  if (!origin) {
    return new Response(JSON.stringify({ error: { code: "forbidden" } }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: { code: "method_not_allowed" } }, 405, origin);
  }
  if (
    !req.headers.get("Content-Type")?.toLowerCase().startsWith(
      "application/json",
    )
  ) {
    return json({ error: { code: "unsupported_media_type" } }, 415, origin);
  }

  const declaredLength = Number(req.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: { code: "payload_too_large" } }, 413, origin);
  }

  const rawBody = await req.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return json({ error: { code: "payload_too_large" } }, 413, origin);
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error();
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return json({ error: { code: "invalid_request" } }, 400, origin);
  }

  const keys = Object.keys(payload);
  if (keys.some((key) => !["order_identifier", "source"].includes(key))) {
    return json({ error: { code: "invalid_request" } }, 400, origin);
  }
  if (
    typeof payload.order_identifier !== "string" ||
    typeof payload.source !== "string" ||
    payload.order_identifier.length > 80 ||
    payload.source.length > 40
  ) {
    return json({ error: { code: "invalid_request" } }, 400, origin);
  }

  const orderIdentifier = normalize(payload.order_identifier, 80);
  const source = normalize(payload.source, 40);
  if (
    !orderIdentifier ||
    !ORDER_IDENTIFIER_PATTERN.test(orderIdentifier) ||
    !source ||
    !SOURCES.has(source)
  ) {
    return json({ error: { code: "invalid_request" } }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: { code: "service_unavailable" } }, 503, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let order: { lemon_order_id: string; lemon_identifier: string } | null = null;
  for (const delay of RETRY_DELAYS_MS) {
    if (delay) await sleep(delay);
    const { data, error } = await supabase
      .from("lemon_orders")
      .select("lemon_order_id,lemon_identifier")
      .eq("lemon_identifier", orderIdentifier)
      .maybeSingle();
    if (error) {
      console.error("Purchase feedback order lookup failed", error.code);
      return json({ error: { code: "service_unavailable" } }, 503, origin);
    }
    if (data?.lemon_order_id && data?.lemon_identifier) {
      order = data;
      break;
    }
  }

  if (!order) {
    return json({ ok: false, pending: true }, 202, origin);
  }

  const { error } = await supabase.from("purchase_source_responses").upsert(
    {
      lemon_order_id: order.lemon_order_id,
      lemon_identifier: order.lemon_identifier,
      source,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lemon_order_id" },
  );
  if (error) {
    console.error("Purchase feedback upsert failed", error.code);
    return json({ error: { code: "service_unavailable" } }, 503, origin);
  }

  return json({ ok: true }, 200, origin);
});
