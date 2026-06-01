import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-v4-flash";
const PROMPT_VERSION = "ai_equalizer_v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Track = {
  artist?: string;
  title?: string;
  album?: string;
};

type ClientInfo = {
  appVersion?: string;
  installationId?: string;
  licenseKey?: string;
  licenseInstanceId?: string;
};

type EQProfile = {
  bass: number;
  mid: number;
  treble: number;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function envFlag(name: string, fallback: boolean): boolean {
  const raw = Deno.env.get(name);
  if (raw == null || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function envNumber(name: string, fallback: number): number {
  const raw = Number(Deno.env.get(name));
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
}

function normalize(value: unknown, maxLength: number): string {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizedForHash(value: unknown): string {
  return normalize(value, 240).toLowerCase();
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
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

function monthStartISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function clamp(level: number): number {
  return Math.min(10, Math.max(-10, Math.round(level)));
}

function aggressiveLevel(level: number): number {
  const clamped = clamp(level);
  if (clamped === 0) return 0;
  const scaled = Math.round(clamped * 2);
  const sign = scaled < 0 ? -1 : 1;
  return clamp(Math.max(Math.abs(scaled), 4) * sign);
}

function normalizeProfile(profile: EQProfile): EQProfile {
  return {
    bass: aggressiveLevel(profile.bass),
    mid: aggressiveLevel(profile.mid),
    treble: aggressiveLevel(profile.treble),
  };
}

function parseProfileFromDeepSeek(root: any): EQProfile | null {
  const content = root?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;

  try {
    const parsed = JSON.parse(content);
    const bass = Number(parsed.bass);
    const mid = Number(parsed.mid);
    const treble = Number(parsed.treble);
    if (![bass, mid, treble].every(Number.isFinite)) return null;
    return normalizeProfile({ bass, mid, treble });
  } catch {
    return null;
  }
}

function deepSeekBody(track: Required<Track>, model: string): string {
  const userLine = [
    `Artist: ${track.artist || "Unknown Artist"}`,
    `Title: ${track.title}`,
    track.album ? `Album: ${track.album}` : "",
  ].filter(Boolean).join("\n");

  const system = [
    "You are an audio engineer tuning a 3-band equalizer on Bose QuietComfort Ultra headphones.",
    "Given one song, pick a bold, clearly audible EQ curve that best suits its genre, mood, and production.",
    'Bands: "bass" (lows), "mid" (vocals/instruments), "treble" (highs).',
    "Each level is an integer from -10 to 10, where 0 is flat/neutral.",
    "Prefer decisive values in the 4 to 8 range when a band should change.",
    "Do not return all zeros.",
    'Reply with only a json object of the form {"bass": <int>, "mid": <int>, "treble": <int>} and nothing else.',
  ].join(" ");

  return JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userLine },
    ],
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 200,
    stream: false,
  });
}

async function validateLicense(licenseKey: string, instanceId?: string): Promise<boolean> {
  const body = new URLSearchParams({ license_key: licenseKey });
  if (instanceId) body.set("instance_id", instanceId);

  try {
    const res = await fetch("https://api.lemonsqueezy.com/v1/licenses/validate", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.valid === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "method_not_allowed" } }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const deepSeekKey = Deno.env.get("DEEPSEEK_API_KEY");
  const hashSalt = Deno.env.get("AI_EQ_HASH_SALT") ?? serviceRoleKey ?? "ancbuddy-ai-eq";

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: { code: "service_unconfigured" } }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let body: { track?: Track; client?: ClientInfo };
  try {
    body = await req.json();
  } catch {
    return json({ error: { code: "bad_json" } }, 400);
  }

  const rawTrack = body.track ?? {};
  const track = {
    artist: normalize(rawTrack.artist, 180),
    title: normalize(rawTrack.title, 220),
    album: normalize(rawTrack.album, 220),
  };
  if (!track.title) {
    return json({ error: { code: "missing_track" } }, 400);
  }

  const client = body.client ?? {};
  const installationId = normalize(client.installationId, 128);
  if (!installationId) {
    return json({ error: { code: "missing_installation" } }, 400);
  }

  const model = Deno.env.get("AI_EQ_MODEL") ?? DEFAULT_MODEL;
  const hashInput = [
    normalizedForHash(track.artist),
    normalizedForHash(track.title),
    normalizedForHash(track.album),
    PROMPT_VERSION,
    model,
  ].join("|");
  const trackHash = await hmacSHA256(hashSalt, hashInput);

  const cacheResult = await supabase
    .from("ai_eq_cache")
    .select("profile, model, prompt_version")
    .eq("track_hash", trackHash)
    .maybeSingle();

  if (cacheResult.data?.profile) {
    return json({ profile: cacheResult.data.profile, source: "cache" });
  }

  const aiEnabled = envFlag("AI_EQ_ENABLED", true);
  if (!aiEnabled || !deepSeekKey) {
    await supabase.from("ai_eq_usage_events").insert({
      installation_id: installationId,
      tier: "trial",
      track_hash: trackHash,
      model,
      prompt_version: PROMPT_VERSION,
      cache_hit: false,
      status: "blocked",
      block_reason: "global_hard_limit",
    });
    return json({ error: { code: "service_busy" } }, 503);
  }

  const devIds = (Deno.env.get("AI_EQ_DEV_INSTALL_IDS") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const licenseKey = normalize(client.licenseKey, 128);
  const licenseInstanceId = normalize(client.licenseInstanceId, 128);
  const isDev = devIds.includes(installationId);
  const isPaid = !isDev && licenseKey
    ? await validateLicense(licenseKey, licenseInstanceId)
    : false;
  const tier = isDev ? "dev" : isPaid ? "paid" : "trial";
  const licenseHash = licenseKey
    ? await hmacSHA256(hashSalt, `${licenseKey}|${licenseInstanceId}`)
    : null;

  await supabase.from("ai_eq_installations").upsert({
    installation_id: installationId,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "installation_id" });

  const monthStart = monthStartISO();
  const globalLimit = envNumber("AI_EQ_GLOBAL_MONTHLY_LIMIT", 10_000);
  const trialLimit = envNumber("AI_EQ_TRIAL_FRESH_LIMIT", 100);
  const paidLimit = envNumber("AI_EQ_PAID_MONTHLY_LIMIT", 1_000);

  async function countGlobalFresh(): Promise<number> {
    const { count } = await supabase
      .from("ai_eq_usage_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart)
      .eq("cache_hit", false)
      .eq("status", "ok");
    return count ?? 0;
  }

  async function countInstallFresh(id: string): Promise<number> {
    const { count } = await supabase
      .from("ai_eq_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("installation_id", id)
      .eq("cache_hit", false)
      .eq("status", "ok");
    return count ?? 0;
  }

  async function countLicenseFresh(hash: string): Promise<number> {
    const { count } = await supabase
      .from("ai_eq_usage_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart)
      .eq("license_hash", hash)
      .eq("cache_hit", false)
      .eq("status", "ok");
    return count ?? 0;
  }

  if (!isDev && globalLimit > 0) {
    const globalFresh = await countGlobalFresh();
    if (globalFresh >= globalLimit) {
      await supabase.from("ai_eq_usage_events").insert({
        installation_id: installationId,
        license_hash: licenseHash,
        tier,
        track_hash: trackHash,
        model,
        prompt_version: PROMPT_VERSION,
        cache_hit: false,
        status: "blocked",
        block_reason: "global_hard_limit",
      });
      return json({ error: { code: "service_busy" } }, 503);
    }
  }

  if (!isDev) {
    const limit = tier === "paid" ? paidLimit : trialLimit;
    const used = tier === "paid" && licenseHash
      ? await countLicenseFresh(licenseHash)
      : await countInstallFresh(installationId);
    if (limit > 0 && used >= limit) {
      await supabase.from("ai_eq_usage_events").insert({
        installation_id: installationId,
        license_hash: licenseHash,
        tier,
        track_hash: trackHash,
        model,
        prompt_version: PROMPT_VERSION,
        cache_hit: false,
        status: "blocked",
        block_reason: "user_limit",
      });
      return json({ error: { code: "limit_reached" } }, 429);
    }
  }

  let deepSeekResponse: any;
  try {
    const res = await fetch(DEEPSEEK_ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Authorization": `Bearer ${deepSeekKey}`,
        "Content-Type": "application/json",
      },
      body: deepSeekBody(track, model),
    });
    deepSeekResponse = await res.json();
    if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
  } catch {
    await supabase.from("ai_eq_usage_events").insert({
      installation_id: installationId,
      license_hash: licenseHash,
      tier,
      track_hash: trackHash,
      model,
      prompt_version: PROMPT_VERSION,
      cache_hit: false,
      status: "error",
      block_reason: "api_error",
    });
    return json({ error: { code: "service_failed" } }, 502);
  }

  const profile = parseProfileFromDeepSeek(deepSeekResponse);
  if (!profile) {
    await supabase.from("ai_eq_usage_events").insert({
      installation_id: installationId,
      license_hash: licenseHash,
      tier,
      track_hash: trackHash,
      model,
      prompt_version: PROMPT_VERSION,
      cache_hit: false,
      status: "error",
      block_reason: "api_error",
    });
    return json({ error: { code: "service_failed" } }, 502);
  }

  const inputTokens = Number(deepSeekResponse?.usage?.prompt_tokens);
  const outputTokens = Number(deepSeekResponse?.usage?.completion_tokens);

  await supabase.from("ai_eq_cache").upsert({
    track_hash: trackHash,
    profile,
    model,
    prompt_version: PROMPT_VERSION,
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : null,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "track_hash" });

  await supabase.from("ai_eq_usage_events").insert({
    installation_id: installationId,
    license_hash: licenseHash,
    tier,
    track_hash: trackHash,
    model,
    prompt_version: PROMPT_VERSION,
    cache_hit: false,
    status: "ok",
    block_reason: "none",
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : null,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : null,
  });

  return json({ profile, source: "deepseek" });
});
