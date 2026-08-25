import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

class DisabledStorage {
  getItem() {
    throw new Error("storage disabled");
  }

  setItem() {
    throw new Error("storage disabled");
  }

  removeItem() {
    throw new Error("storage disabled");
  }
}

let uuidCounter = 1;
function nextUuid() {
  const suffix = uuidCounter.toString(16).padStart(12, "0");
  uuidCounter += 1;
  return `00000000-0000-4000-8000-${suffix}`;
}

function browserContext(
  url,
  {
    localStorage = new MemoryStorage(),
    sessionStorage = new MemoryStorage(),
    referrer = "",
  } = {},
) {
  const requests = [];
  const window = {
    location: new URL(url),
    localStorage,
    sessionStorage,
    crypto: { randomUUID: nextUuid },
    history: {
      state: null,
      replaceState(_state, _title, nextUrl) {
        window.location = new URL(nextUrl, window.location);
      },
    },
    setTimeout,
    requestIdleCallback(task) {
      task();
      return 1;
    },
  };

  globalThis.window = window;
  globalThis.document = { referrer };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "ANCBuddy synthetic browser test" },
  });
  globalThis.fetch = async (requestUrl, options) => {
    requests.push({
      url: requestUrl,
      headers: options.headers,
      body: JSON.parse(options.body),
    });
    return { ok: true, status: 201 };
  };

  return { localStorage, requests, sessionStorage, window };
}

const sourcePath = process.argv[2];
const compiledPath = resolve(tmpdir(), `ancbuddy-attribution-test-${process.pid}.mjs`);
const source = (await readFile(sourcePath, "utf8"))
  .replace(
    "import.meta.env.VITE_SUPABASE_URL",
    '"https://example.supabase.co"',
  )
  .replace(
    "import.meta.env.VITE_SUPABASE_ANON_KEY",
    '"sb_publishable_synthetic"',
  );
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
await writeFile(compiledPath, compiled.outputText);

let importCounter = 0;
async function importFresh() {
  importCounter += 1;
  return import(`${pathToFileURL(compiledPath).href}?case=${importCounter}`);
}

const localStorage = new MemoryStorage();
const sessionStorage = new MemoryStorage();
const initial = browserContext(
  "https://ancbuddy.com/?ancbuddy_internal=1&utm_source=producthunt&utm_medium=launch&utm_campaign=august&utm_content=hero",
  {
    localStorage,
    sessionStorage,
    referrer: "https://www.producthunt.com/posts/ancbuddy",
  },
);
const analytics = await importFresh();
const first = analytics.getAttributionPayload();

assert.equal(first.attribution_version, 2);
assert.match(first.visitor_id, UUID_PATTERN);
assert.match(first.session_id, UUID_PATTERN);
assert.equal(first.first_utm_source, "producthunt");
assert.equal(first.last_utm_source, "producthunt");
assert.equal(first.first_referrer_host, "www.producthunt.com");
assert.equal(first.first_landing_path, first.last_landing_path);
assert.equal(first.is_internal, true);
assert.equal(initial.window.location.search, "?utm_source=producthunt&utm_medium=launch&utm_campaign=august&utm_content=hero");
assert.equal(localStorage.getItem("ancbuddy_internal_analytics_v1"), "1");

analytics.trackSiteEvent("page_view");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(initial.requests.length, 1);
assert.equal(initial.requests[0].headers.apikey, "sb_publishable_synthetic");
assert.equal("Authorization" in initial.requests[0].headers, false);
assert.equal(initial.requests[0].body.visitor_id, first.visitor_id);
assert.equal(initial.requests[0].body.session_id, first.session_id);
assert.equal(initial.requests[0].body.attribution_version, 2);

initial.window.location = new URL("https://ancbuddy.com/download.html");
globalThis.document.referrer = "https://ancbuddy.com/";
const navigated = analytics.getAttributionPayload();
assert.equal(navigated.visitor_id, first.visitor_id);
assert.equal(navigated.session_id, first.session_id);
assert.equal(navigated.first_utm_source, "producthunt");
assert.equal(navigated.last_utm_source, "producthunt");
assert.equal(navigated.first_landing_path, first.first_landing_path);
assert.equal(navigated.current_path, "/download.html");

initial.window.location = new URL(
  "https://ancbuddy.com/?utm_source=newsletter&utm_medium=email&utm_campaign=followup&utm_content=footer",
);
globalThis.document.referrer = "https://example.com/story";
const retouched = analytics.getAttributionPayload();
assert.equal(retouched.first_utm_source, "producthunt");
assert.equal(retouched.last_utm_source, "newsletter");
assert.equal(retouched.utm_source, "newsletter");
assert.equal(retouched.first_referrer_host, "www.producthunt.com");
assert.equal(retouched.last_referrer_host, "example.com");

const checkout = new URL(analytics.buildCheckoutUrl());
assert.equal(checkout.searchParams.get("checkout[custom][visitor_id]"), first.visitor_id);
assert.equal(checkout.searchParams.get("checkout[custom][session_id]"), first.session_id);
assert.equal(checkout.searchParams.get("checkout[custom][attribution_version]"), "2");
assert.equal(checkout.searchParams.get("checkout[custom][first_utm_source]"), "producthunt");
assert.equal(checkout.searchParams.get("checkout[custom][last_utm_source]"), "newsletter");

const requestCountBeforePageView = initial.requests.length;
analytics.trackPageView();
analytics.trackPageView();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(initial.requests.length, requestCountBeforePageView + 1);

initial.window.location = new URL("https://ancbuddy.com/?ancbuddy_internal=0");
assert.equal(analytics.getAttributionPayload().is_internal, false);
assert.equal(initial.window.location.search, "");
assert.equal(localStorage.getItem("ancbuddy_internal_analytics_v1"), null);

const legacySessionStorage = new MemoryStorage();
legacySessionStorage.setItem(
  "ancbuddy_attribution_v1",
  JSON.stringify({
    utm_source: "legacy",
    utm_medium: "community",
    landing_path: "/legacy-entry",
    referrer_host: "reddit.com",
  }),
);
browserContext("https://ancbuddy.com/download.html", {
  sessionStorage: legacySessionStorage,
});
const legacyAnalytics = await importFresh();
const migrated = legacyAnalytics.getAttributionPayload();
assert.equal(migrated.attribution_version, 2);
assert.equal(migrated.first_utm_source, "legacy");
assert.equal(migrated.last_utm_source, "legacy");
assert.equal(migrated.first_landing_path, "/legacy-entry");

browserContext("https://ancbuddy.com/", {
  localStorage: new DisabledStorage(),
  sessionStorage: new DisabledStorage(),
});
const fallbackAnalytics = await importFresh();
const fallbackOne = fallbackAnalytics.getAttributionPayload();
const fallbackTwo = fallbackAnalytics.getAttributionPayload();
assert.match(fallbackOne.visitor_id, UUID_PATTERN);
assert.equal(fallbackTwo.visitor_id, fallbackOne.visitor_id);
assert.equal(fallbackTwo.session_id, fallbackOne.session_id);

console.log("attribution v2 browser contract tests passed");
