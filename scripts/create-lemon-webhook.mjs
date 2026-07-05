#!/usr/bin/env node

const WEBHOOK_URL =
  "https://wryaxqkfpphtzbskfjgi.supabase.co/functions/v1/lemon-order-webhook";
const EVENT = "order_created";
const API_BASE = "https://api.lemonsqueezy.com/v1";

const apiKey = process.env.LEMON_API_KEY;
const signingSecret = process.env.LEMON_WEBHOOK_SECRET;
const configuredStoreId = process.env.LEMON_STORE_ID;

if (!apiKey) throw new Error("LEMON_API_KEY is required");
if (!signingSecret) throw new Error("LEMON_WEBHOOK_SECRET is required");
if (signingSecret.length > 40) {
  throw new Error("LEMON_WEBHOOK_SECRET must be 40 characters or fewer");
}

function headers() {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function lemon(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(
      `Lemon Squeezy API ${res.status}: ${JSON.stringify(json ?? text)}`,
    );
  }
  return json;
}

async function storeId() {
  if (configuredStoreId) return configuredStoreId;

  const stores = await lemon("/stores");
  const rows = Array.isArray(stores.data) ? stores.data : [];
  if (rows.length === 1) return rows[0].id;

  const labels = rows
    .map((store) => `${store.id}: ${store.attributes?.name ?? "unnamed"}`)
    .join(", ");
  throw new Error(
    `Set LEMON_STORE_ID because the API key can access ${rows.length} stores: ${labels}`,
  );
}

function webhookPayload(id, storeIdValue) {
  return {
    data: {
      ...(id ? { id } : {}),
      type: "webhooks",
      attributes: {
        url: WEBHOOK_URL,
        events: [EVENT],
        secret: signingSecret,
        test_mode: false,
      },
      relationships: {
        store: {
          data: {
            type: "stores",
            id: String(storeIdValue),
          },
        },
      },
    },
  };
}

const resolvedStoreId = await storeId();
const webhooks = await lemon(
  `/webhooks?filter[store_id]=${encodeURIComponent(resolvedStoreId)}`,
);
const existing = (Array.isArray(webhooks.data) ? webhooks.data : []).find(
  (webhook) => webhook.attributes?.url === WEBHOOK_URL,
);

if (existing) {
  const result = await lemon(`/webhooks/${existing.id}`, {
    method: "PATCH",
    body: JSON.stringify(webhookPayload(existing.id, resolvedStoreId)),
  });
  console.log(`Updated Lemon Squeezy webhook ${result.data.id} for ${WEBHOOK_URL}`);
} else {
  const result = await lemon("/webhooks", {
    method: "POST",
    body: JSON.stringify(webhookPayload(null, resolvedStoreId)),
  });
  console.log(`Created Lemon Squeezy webhook ${result.data.id} for ${WEBHOOK_URL}`);
}
