import { supabase } from "./supabase";

export const DMG_URL =
  "https://github.com/denizaytac/ancbuddy-site/releases/download/v2.0.2/ANCBuddy-2.0.2.dmg";

export const LEMON_SQUEEZY_URL =
  "https://ancbuddy.lemonsqueezy.com/checkout/buy/b79f3888-28fa-4438-8328-fb604518cbc2";

const ATTRIBUTION_KEY = "ancbuddy_attribution_v1";
const SESSION_ID_KEY = "ancbuddy_session_id_v1";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

export type SiteEventName =
  | "page_view"
  | "trial_open"
  | "trial_start"
  | "download_click"
  | "checkout_click";

export interface AttributionPayload {
  session_id: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_host: string | null;
  landing_path: string;
  current_path: string;
}

type StoredAttribution = Partial<Record<CampaignKey, string>> & {
  referrer_host?: string;
  landing_path?: string;
};

let pageViewTracked = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function pathWithSearch() {
  if (!isBrowser()) return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function readStoredAttribution(): StoredAttribution {
  if (!isBrowser()) return {};

  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : {};
  } catch {
    return {};
  }
}

function writeStoredAttribution(value: StoredAttribution) {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
  } catch {
    // Storage can be disabled; attribution should never block downloads.
  }
}

function createSessionId() {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `anc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function getSessionId() {
  if (!isBrowser()) return "ssr";

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;

    const next = createSessionId();
    window.sessionStorage.setItem(SESSION_ID_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

function referrerHost() {
  if (!isBrowser() || !document.referrer) return null;

  try {
    const host = new URL(document.referrer).host;
    return host === window.location.host ? null : host;
  } catch {
    return null;
  }
}

export function getAttributionPayload(): AttributionPayload {
  const stored = readStoredAttribution();
  const params = isBrowser() ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const next: StoredAttribution = {
    ...stored,
    landing_path: stored.landing_path ?? pathWithSearch(),
    referrer_host: stored.referrer_host ?? referrerHost() ?? undefined,
  };

  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key);
    if (value) next[key] = value;
  }

  writeStoredAttribution(next);

  return {
    session_id: getSessionId(),
    utm_source: next.utm_source ?? null,
    utm_medium: next.utm_medium ?? null,
    utm_campaign: next.utm_campaign ?? null,
    referrer_host: next.referrer_host ?? null,
    landing_path: next.landing_path ?? pathWithSearch(),
    current_path: pathWithSearch(),
  };
}

function compactMetadata(metadata?: Record<string, string | number | boolean | null>) {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

export function trackSiteEvent(
  eventName: SiteEventName,
  metadata?: Record<string, string | number | boolean | null>,
) {
  if (!supabase || !isBrowser()) return;

  const attribution = getAttributionPayload();
  void supabase
    .from("site_events")
    .insert({
      event_name: eventName,
      ...attribution,
      metadata: compactMetadata(metadata),
      user_agent: navigator.userAgent,
    })
    .then(({ error }) => {
      if (error) console.warn(`Site event ${eventName} failed`, error);
    });
}

export function trackPageView() {
  if (pageViewTracked) return;
  pageViewTracked = true;
  trackSiteEvent("page_view");
}

export function buildCheckoutUrl(baseUrl = LEMON_SQUEEZY_URL) {
  const attribution = getAttributionPayload();
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(attribution)) {
    if (value) url.searchParams.set(`checkout[custom][${key}]`, value);
  }

  return url.toString();
}

export function prepareCheckoutLink(anchor: HTMLAnchorElement) {
  anchor.href = buildCheckoutUrl(anchor.href || LEMON_SQUEEZY_URL);
  trackSiteEvent("checkout_click", { href: anchor.href });
}
