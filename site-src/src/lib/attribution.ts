export const DMG_URL =
  "https://github.com/denizaytac/ancbuddy-site/releases/download/v2.2.0/ANCBuddy-2.2.0.dmg";

export const LEMON_SQUEEZY_URL =
  "https://ancbuddy.lemonsqueezy.com/checkout/buy/b79f3888-28fa-4438-8328-fb604518cbc2";

const ATTRIBUTION_VERSION = 2 as const;
const ATTRIBUTION_KEY = "ancbuddy_attribution_v2";
const LEGACY_ATTRIBUTION_KEY = "ancbuddy_attribution_v1";
const VISITOR_ID_KEY = "ancbuddy_visitor_id_v2";
const SESSION_ID_KEY = "ancbuddy_session_id_v1";
const INTERNAL_MARKER_KEY = "ancbuddy_internal_analytics_v1";
const INTERNAL_MARKER_PARAM = "ancbuddy_internal";
const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

export type SiteEventName =
  | "page_view"
  | "trial_open"
  | "trial_start"
  | "download_click"
  | "checkout_click"
  | "purchase_feedback_shown"
  | "purchase_feedback_submitted"
  | "purchase_feedback_skipped";

export interface AttributionPayload {
  visitor_id: string;
  attribution_version: typeof ATTRIBUTION_VERSION;
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  landing_path: string;
  current_path: string;
  first_utm_source: string | null;
  first_utm_medium: string | null;
  first_utm_campaign: string | null;
  first_utm_content: string | null;
  first_referrer_host: string | null;
  first_landing_path: string;
  first_seen_at: string;
  last_utm_source: string | null;
  last_utm_medium: string | null;
  last_utm_campaign: string | null;
  last_utm_content: string | null;
  last_referrer_host: string | null;
  last_landing_path: string;
  last_seen_at: string;
  is_internal: boolean;
}

type Touchpoint = Record<CampaignKey, string | null> & {
  referrer_host: string | null;
  landing_path: string;
  seen_at: string;
};

type StoredAttribution = {
  attribution_version: typeof ATTRIBUTION_VERSION;
  first_touch: Touchpoint;
  last_touch: Touchpoint;
};

type LegacyStoredAttribution = Partial<Record<CampaignKey, string>> & {
  referrer_host?: string;
  landing_path?: string;
};

let pageViewTracked = false;
let memorySessionId: string | null = null;
let memoryVisitorId: string | null = null;
let memoryAttribution: StoredAttribution | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function boundedText(value: unknown, maxLength: number): string | null {
  const text = String(value ?? "").trim().slice(0, maxLength);
  return text || null;
}

function pathWithSearch() {
  if (!isBrowser()) return "/";
  return boundedText(`${window.location.pathname}${window.location.search}`, 1000) ?? "/";
}

function applyInternalMarkerCommand() {
  if (!isBrowser()) return;

  const url = new URL(window.location.href);
  const command = url.searchParams.get(INTERNAL_MARKER_PARAM);
  if (command !== "1" && command !== "0") return;

  try {
    if (command === "1") {
      window.localStorage.setItem(INTERNAL_MARKER_KEY, "1");
    } else {
      window.localStorage.removeItem(INTERNAL_MARKER_KEY);
    }
  } catch {
    // Storage can be disabled; analytics must never block the website.
  }

  url.searchParams.delete(INTERNAL_MARKER_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function isInternalAnalyticsBrowser() {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(INTERNAL_MARKER_KEY) === "1";
  } catch {
    return false;
  }
}

function readSessionValue(key: string) {
  if (!isBrowser()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: string) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // In-memory fallbacks keep one page internally consistent.
  }
}

function createUuid() {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (isBrowser() && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function getSessionId() {
  if (!isBrowser()) return "ssr";
  if (memorySessionId) return memorySessionId;

  const existing = boundedText(readSessionValue(SESSION_ID_KEY), 80);
  memorySessionId = existing ?? createUuid();
  writeSessionValue(SESSION_ID_KEY, memorySessionId);
  return memorySessionId;
}

function getVisitorId() {
  if (!isBrowser()) return "00000000-0000-4000-8000-000000000000";
  if (memoryVisitorId) return memoryVisitorId;

  const existing = boundedText(readSessionValue(VISITOR_ID_KEY), 80);
  memoryVisitorId = existing && UUID_PATTERN.test(existing) ? existing : createUuid();
  writeSessionValue(VISITOR_ID_KEY, memoryVisitorId);
  return memoryVisitorId;
}

function referrerHost() {
  if (!isBrowser() || !document.referrer) return null;

  try {
    const host = new URL(document.referrer).host;
    return host === window.location.host ? null : boundedText(host, 255);
  } catch {
    return null;
  }
}

function currentTouch(now: string): Touchpoint {
  const params = isBrowser()
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  return {
    utm_source: boundedText(params.get("utm_source"), 160),
    utm_medium: boundedText(params.get("utm_medium"), 160),
    utm_campaign: boundedText(params.get("utm_campaign"), 160),
    utm_content: boundedText(params.get("utm_content"), 160),
    referrer_host: referrerHost(),
    landing_path: pathWithSearch(),
    seen_at: now,
  };
}

function hasAttributionSignal(touch: Touchpoint) {
  return CAMPAIGN_KEYS.some((key) => touch[key] !== null) || touch.referrer_host !== null;
}

function legacyTouch(now: string): Touchpoint | null {
  const raw = readSessionValue(LEGACY_ATTRIBUTION_KEY);
  if (!raw) return null;

  try {
    const legacy = JSON.parse(raw) as LegacyStoredAttribution;
    return {
      utm_source: boundedText(legacy.utm_source, 160),
      utm_medium: boundedText(legacy.utm_medium, 160),
      utm_campaign: boundedText(legacy.utm_campaign, 160),
      utm_content: boundedText(legacy.utm_content, 160),
      referrer_host: boundedText(legacy.referrer_host, 255),
      landing_path: boundedText(legacy.landing_path, 1000) ?? pathWithSearch(),
      seen_at: now,
    };
  } catch {
    return null;
  }
}

function isTouchpoint(value: unknown): value is Touchpoint {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Touchpoint>;
  return typeof candidate.landing_path === "string" && typeof candidate.seen_at === "string";
}

function readStoredAttribution(): StoredAttribution | null {
  if (memoryAttribution) return memoryAttribution;
  const raw = readSessionValue(ATTRIBUTION_KEY);
  if (!raw) return null;

  try {
    const stored = JSON.parse(raw) as Partial<StoredAttribution>;
    if (
      stored.attribution_version !== ATTRIBUTION_VERSION ||
      !isTouchpoint(stored.first_touch) ||
      !isTouchpoint(stored.last_touch)
    ) {
      return null;
    }
    memoryAttribution = stored as StoredAttribution;
    return memoryAttribution;
  } catch {
    return null;
  }
}

function writeStoredAttribution(value: StoredAttribution) {
  memoryAttribution = value;
  writeSessionValue(ATTRIBUTION_KEY, JSON.stringify(value));
}

export function getAttributionPayload(): AttributionPayload {
  applyInternalMarkerCommand();
  const now = new Date().toISOString();
  const observedTouch = currentTouch(now);
  const stored = readStoredAttribution();
  const initialTouch = legacyTouch(now) ?? observedTouch;
  const firstTouch = stored?.first_touch ?? initialTouch;
  const previousLastTouch = stored?.last_touch ?? initialTouch;
  const lastTouch = hasAttributionSignal(observedTouch)
    ? observedTouch
    : { ...previousLastTouch, seen_at: now };

  writeStoredAttribution({
    attribution_version: ATTRIBUTION_VERSION,
    first_touch: firstTouch,
    last_touch: lastTouch,
  });

  return {
    visitor_id: getVisitorId(),
    attribution_version: ATTRIBUTION_VERSION,
    session_id: getSessionId(),
    utm_source: lastTouch.utm_source,
    utm_medium: lastTouch.utm_medium,
    utm_campaign: lastTouch.utm_campaign,
    utm_content: lastTouch.utm_content,
    referrer_host: lastTouch.referrer_host,
    landing_path: firstTouch.landing_path,
    current_path: pathWithSearch(),
    first_utm_source: firstTouch.utm_source,
    first_utm_medium: firstTouch.utm_medium,
    first_utm_campaign: firstTouch.utm_campaign,
    first_utm_content: firstTouch.utm_content,
    first_referrer_host: firstTouch.referrer_host,
    first_landing_path: firstTouch.landing_path,
    first_seen_at: firstTouch.seen_at,
    last_utm_source: lastTouch.utm_source,
    last_utm_medium: lastTouch.utm_medium,
    last_utm_campaign: lastTouch.utm_campaign,
    last_utm_content: lastTouch.utm_content,
    last_referrer_host: lastTouch.referrer_host,
    last_landing_path: lastTouch.landing_path,
    last_seen_at: lastTouch.seen_at,
    is_internal: isInternalAnalyticsBrowser(),
  };
}

function compactMetadata(metadata?: Record<string, string | number | boolean | null>) {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

function scheduleIdle(task: () => void) {
  if (!isBrowser()) return;
  if (window.requestIdleCallback) {
    window.requestIdleCallback(task, { timeout: 2500 });
    return;
  }
  window.setTimeout(task, 600);
}

export async function insertSupabaseRow(
  table: "site_events" | "trial_signups",
  payload: Record<string, unknown>,
  options: { signal?: AbortSignal; keepalive?: boolean } = {},
) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !isBrowser()) return;

  const response = await fetch(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${table}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: options.keepalive,
      signal: options.signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase ${table} insert failed: HTTP ${response.status}`);
  }
}

export function trackSiteEvent(
  eventName: SiteEventName,
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (!isBrowser()) return;

  const attribution = getAttributionPayload();
  void insertSupabaseRow(
    "site_events",
    {
      event_name: eventName,
      ...attribution,
      metadata: compactMetadata(metadata),
      user_agent: boundedText(navigator.userAgent, 600),
    },
    { keepalive: true },
  ).catch((error) => {
    console.warn(`Site event ${eventName} failed`, error);
  });
}

export function trackPageView() {
  if (pageViewTracked) return;
  pageViewTracked = true;
  scheduleIdle(() => trackSiteEvent("page_view"));
}

export function buildCheckoutUrl(baseUrl = LEMON_SQUEEZY_URL) {
  const attribution = getAttributionPayload();
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(attribution)) {
    if (value !== null && value !== "") {
      url.searchParams.set(`checkout[custom][${key}]`, String(value));
    }
  }

  return url.toString();
}

export function prepareCheckoutLink(anchor: HTMLAnchorElement) {
  anchor.href = buildCheckoutUrl(anchor.href || LEMON_SQUEEZY_URL);
  trackSiteEvent("checkout_click", { placement: "pricing" });
}
