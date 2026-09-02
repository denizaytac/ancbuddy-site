import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.3";

type JsonRecord = Record<string, unknown>;
type SupabaseQueryClient = {
  from: (table: string) => any;
};
type SyncState = {
  token_hash: string;
  last_started_at: string | null;
  last_status: string;
};
type TrialAttribution = {
  id: string;
  visitor_id: string | null;
  attribution_version: number | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  current_path: string | null;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_referrer_host: string | null;
  first_landing_path: string | null;
  first_seen_at: string | null;
  last_utm_source: string | null;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  last_utm_content: string | null;
  last_referrer_host: string | null;
  last_landing_path: string | null;
  last_seen_at: string | null;
  is_internal: boolean | null;
};

const API_ORIGIN = "https://api.lemonsqueezy.com";
const MAX_PAGES = 100;
const RUNNING_TIMEOUT_MS = 10 * 60 * 1000;

class SyncFailure extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
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
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true";
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

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}

async function hmacSHA256(secret: string, value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function supabaseSecretKey(): string | null {
  const encoded = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (encoded) {
    try {
      const keys = JSON.parse(encoded) as Record<string, unknown>;
      const preferred = normalize(keys.default, 1000);
      if (preferred) return preferred;
      for (const value of Object.values(keys)) {
        const candidate = normalize(value, 1000);
        if (candidate) return candidate;
      }
    } catch {
      // Fall through to the legacy key while projects complete their migration.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

async function lemonRequest(
  apiKey: string,
  input: string,
): Promise<JsonRecord> {
  const url = new URL(input, API_ORIGIN);
  if (url.origin !== API_ORIGIN || !url.pathname.startsWith("/v1/")) {
    throw new SyncFailure("lemon_invalid_pagination_url");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new SyncFailure("lemon_network_error");
  }

  if (!response.ok) {
    throw new SyncFailure(`lemon_http_${response.status}`);
  }

  try {
    return asRecord(await response.json());
  } catch {
    throw new SyncFailure("lemon_invalid_json");
  }
}

async function fetchCollection(
  apiKey: string,
  initialPath: string,
): Promise<{ rows: JsonRecord[]; apiTotal: number }> {
  const rows: JsonRecord[] = [];
  let apiTotal = 0;
  let next: string | null = initialPath;

  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const payload = await lemonRequest(apiKey, next);
    const data = Array.isArray(payload.data) ? payload.data : [];
    rows.push(...data.map(asRecord));

    const metaPage = asRecord(asRecord(payload.meta).page);
    apiTotal = asInteger(metaPage.total) ?? rows.length;
    next = normalize(asRecord(payload.links).next, 2000);
  }

  if (next) throw new SyncFailure("lemon_pagination_limit");
  return { rows, apiTotal };
}

async function resolveStore(apiKey: string): Promise<JsonRecord> {
  const configured = normalize(Deno.env.get("LEMON_STORE_ID"), 80);
  const { rows } = await fetchCollection(apiKey, "/v1/stores?page[size]=100");

  if (configured) {
    const store = rows.find((row) => normalize(row.id, 80) === configured);
    if (store) return store;
    throw new SyncFailure("lemon_store_not_accessible");
  }

  if (rows.length === 1) {
    const id = normalize(rows[0].id, 80);
    if (id) return rows[0];
  }
  throw new SyncFailure("lemon_store_ambiguous");
}

async function findTrialSignup(
  supabase: SupabaseQueryClient,
  email: string | null,
  purchasedAt: string | null,
): Promise<TrialAttribution | null> {
  if (!email) return null;

  let query = supabase
    .from("trial_signups")
    .select([
      "id",
      "visitor_id",
      "attribution_version",
      "session_id",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "referrer_host",
      "landing_path",
      "current_path",
      "first_utm_source",
      "first_utm_medium",
      "first_utm_campaign",
      "first_utm_content",
      "first_referrer_host",
      "first_landing_path",
      "first_seen_at",
      "last_utm_source",
      "last_utm_medium",
      "last_utm_campaign",
      "last_utm_content",
      "last_referrer_host",
      "last_landing_path",
      "last_seen_at",
      "is_internal",
    ].join(","))
    .eq("email_normalized", email)
    .order("created_at", { ascending: false })
    .limit(1);

  if (purchasedAt) query = query.lte("created_at", purchasedAt);
  const { data, error } = await query;
  if (error) throw new SyncFailure("trial_lookup_failed");
  return (data as TrialAttribution[] | null)?.[0] ?? null;
}

function trialFields(trial: TrialAttribution): JsonRecord {
  return {
    conversion_path: "trial_led",
    trial_signup_id: trial.id,
    visitor_id: trial.visitor_id,
    attribution_version: trial.attribution_version,
    session_id: trial.session_id,
    utm_source: trial.utm_source,
    utm_medium: trial.utm_medium,
    utm_campaign: trial.utm_campaign,
    utm_content: trial.utm_content,
    referrer_host: trial.referrer_host,
    landing_path: trial.landing_path,
    current_path: trial.current_path,
    first_utm_source: trial.first_utm_source,
    first_utm_medium: trial.first_utm_medium,
    first_utm_campaign: trial.first_utm_campaign,
    first_utm_content: trial.first_utm_content,
    first_referrer_host: trial.first_referrer_host,
    first_landing_path: trial.first_landing_path,
    first_seen_at: trial.first_seen_at,
    last_utm_source: trial.last_utm_source,
    last_utm_medium: trial.last_utm_medium,
    last_utm_campaign: trial.last_utm_campaign,
    last_utm_content: trial.last_utm_content,
    last_referrer_host: trial.last_referrer_host,
    last_landing_path: trial.last_landing_path,
    last_seen_at: trial.last_seen_at,
    is_internal: Boolean(trial.is_internal),
  };
}

async function syncOrder(
  supabase: SupabaseQueryClient,
  emailHashSalt: string,
  resource: JsonRecord,
  syncedAt: string,
): Promise<void> {
  const orderId = normalize(resource.id, 80);
  if (!orderId) throw new SyncFailure("lemon_order_missing_id");

  const attributes = asRecord(resource.attributes);
  const email = normalizeEmail(attributes.user_email);
  const createdAt = asIsoDate(attributes.created_at);
  const firstItem = asRecord(attributes.first_order_item);

  const { data: existing, error: existingError } = await supabase
    .from("lemon_orders")
    .select("id")
    .eq("lemon_order_id", orderId)
    .maybeSingle();
  if (existingError) throw new SyncFailure("order_lookup_failed");

  const row: JsonRecord = {
    lemon_order_id: orderId,
    lemon_identifier: normalize(attributes.identifier, 120),
    lemon_order_number: normalize(attributes.order_number, 80),
    lemon_store_id: normalize(attributes.store_id, 80),
    lemon_customer_id: normalize(attributes.customer_id, 80),
    customer_email_hash: email ? await hmacSHA256(emailHashSalt, email) : null,
    amount_total: asInteger(attributes.total),
    amount_usd: asInteger(attributes.total_usd),
    tax_amount: asInteger(attributes.tax) ?? 0,
    tax_amount_usd: asInteger(attributes.tax_usd) ?? 0,
    refunded_amount: asInteger(attributes.refunded_amount) ?? 0,
    refunded_amount_usd: asInteger(attributes.refunded_amount_usd) ?? 0,
    currency: normalize(attributes.currency, 12),
    status: normalize(attributes.status, 80),
    refunded: asBoolean(attributes.refunded),
    lemon_created_at: createdAt,
    lemon_updated_at: asIsoDate(attributes.updated_at),
    test_mode: asBoolean(attributes.test_mode),
    product_name: normalize(firstItem.product_name, 255),
    variant_name: normalize(firstItem.variant_name, 255),
    api_last_seen_at: syncedAt,
    updated_at: syncedAt,
  };

  if (!existing) {
    const trial = await findTrialSignup(supabase, email, createdAt);
    Object.assign(row, {
      event_name: "order_created",
      conversion_path: trial ? "trial_led" : "direct",
      custom_data: {},
      raw_event: {
        source: "lemon_api_sync",
        order_id: orderId,
        synced_at: syncedAt,
      },
      is_internal: false,
    });
    if (trial) Object.assign(row, trialFields(trial));
  }

  // Updating and inserting separately is intentional. Existing webhook rows have
  // a non-null raw_event that must stay untouched; an INSERT ... ON CONFLICT
  // candidate without raw_event can fail its NOT NULL check before the update.
  const { error } = existing
    ? await supabase
      .from("lemon_orders")
      .update(row)
      .eq("lemon_order_id", orderId)
    : await supabase
      .from("lemon_orders")
      .insert(row);
  if (error) throw new SyncFailure("order_upsert_failed");
}

async function updateCustomerSnapshot(
  supabase: SupabaseQueryClient,
  customers: JsonRecord[],
  store: JsonRecord,
  syncedAt: string,
): Promise<void> {
  const storeId = normalize(store.id, 80);
  if (!storeId) throw new SyncFailure("lemon_store_missing_id");
  const storeAttributes = asRecord(store.attributes);
  const statusCounts: Record<string, number> = {};
  let totalCustomers = 0;
  let subscribedCustomers = 0;
  let revenueCustomers = 0;
  let customerRevenue = 0;

  for (const resource of customers) {
    const attributes = asRecord(resource.attributes);
    if (asBoolean(attributes.test_mode)) continue;
    totalCustomers += 1;
    const status = normalize(attributes.status, 80) ?? "unknown";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    if (status === "subscribed") subscribedCustomers += 1;
    const revenue = asInteger(attributes.total_revenue_currency) ?? 0;
    if (revenue > 0) revenueCustomers += 1;
    customerRevenue += revenue;
  }

  const { error } = await supabase.from("lemon_customer_snapshot").upsert({
    singleton: true,
    lemon_store_id: storeId,
    store_total_sales: asInteger(storeAttributes.total_sales) ?? 0,
    store_total_revenue_usd_minor: asInteger(storeAttributes.total_revenue) ??
      0,
    store_thirty_day_sales: asInteger(storeAttributes.thirty_day_sales) ?? 0,
    store_thirty_day_revenue_usd_minor:
      asInteger(storeAttributes.thirty_day_revenue) ?? 0,
    total_customers: totalCustomers,
    subscribed_customers: subscribedCustomers,
    revenue_customers: revenueCustomers,
    total_customer_revenue_usd_minor: customerRevenue,
    status_counts: statusCounts,
    synced_at: syncedAt,
    updated_at: syncedAt,
  }, { onConflict: "singleton" });
  if (error) throw new SyncFailure("customer_snapshot_upsert_failed");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: { code: "method_not_allowed" } }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = supabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return json({ error: { code: "supabase_unconfigured" } }, 503);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false },
  });
  const presentedToken = req.headers.get("X-ANCBuddy-Sync-Token") ?? "";
  const presentedHash = await sha256(presentedToken);
  const { data: state, error: stateError } = await supabase
    .from("lemon_sync_state")
    .select("token_hash,last_started_at,last_status")
    .eq("singleton", true)
    .single();

  if (stateError || !state) {
    return json({ error: { code: "sync_state_unavailable" } }, 503);
  }
  const syncState = state as SyncState;
  if (!timingSafeEqual(presentedHash, syncState.token_hash)) {
    return json({ error: { code: "unauthorized" } }, 401);
  }

  if (syncState.last_status === "running" && syncState.last_started_at) {
    const started = new Date(syncState.last_started_at).getTime();
    if (Number.isFinite(started) && Date.now() - started < RUNNING_TIMEOUT_MS) {
      return json({ error: { code: "sync_already_running" } }, 409);
    }
  }

  const startedAt = new Date().toISOString();
  await supabase.from("lemon_sync_state").update({
    last_started_at: startedAt,
    last_status: "running",
    last_error_code: null,
    updated_at: startedAt,
  }).eq("singleton", true);

  try {
    const apiKey = Deno.env.get("LEMON_API_KEY");
    const emailHashSalt = Deno.env.get("LEMON_EMAIL_HASH_SALT");
    if (!apiKey) throw new SyncFailure("lemon_api_key_missing");
    if (!emailHashSalt) throw new SyncFailure("email_hash_salt_missing");

    const store = await resolveStore(apiKey);
    const storeId = normalize(store.id, 80);
    if (!storeId) throw new SyncFailure("lemon_store_missing_id");
    const encodedStore = encodeURIComponent(storeId);
    const orders = await fetchCollection(
      apiKey,
      `/v1/orders?filter[store_id]=${encodedStore}&page[size]=100`,
    );
    const customers = await fetchCollection(
      apiKey,
      `/v1/customers?filter[store_id]=${encodedStore}&page[size]=100`,
    );
    const syncedAt = new Date().toISOString();

    for (const order of orders.rows) {
      await syncOrder(supabase, emailHashSalt, order, syncedAt);
    }
    await updateCustomerSnapshot(supabase, customers.rows, store, syncedAt);

    const { error: completionError } = await supabase
      .from("lemon_sync_state")
      .update({
        last_completed_at: syncedAt,
        last_status: "success",
        last_error_code: null,
        last_orders_seen: orders.apiTotal,
        last_orders_upserted: orders.rows.length,
        last_customers_seen: customers.apiTotal,
        last_store_id: storeId,
        updated_at: syncedAt,
      })
      .eq("singleton", true);
    if (completionError) throw new SyncFailure("sync_state_update_failed");

    console.log("Lemon commerce sync completed", {
      orders: orders.rows.length,
      customers: customers.rows.length,
    });
    return json({
      ok: true,
      orders_seen: orders.apiTotal,
      orders_upserted: orders.rows.length,
      customers_seen: customers.apiTotal,
      synced_at: syncedAt,
    });
  } catch (error) {
    const code = error instanceof SyncFailure ? error.code : "unexpected_error";
    const failedAt = new Date().toISOString();
    await supabase.from("lemon_sync_state").update({
      last_completed_at: failedAt,
      last_status: "error",
      last_error_code: code,
      updated_at: failedAt,
    }).eq("singleton", true);
    console.error("Lemon commerce sync failed", { code });
    return json({ error: { code } }, 502);
  }
});
