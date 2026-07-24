import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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

function browserContext(url, localStorage = new MemoryStorage()) {
  const requests = [];
  const window = {
    location: new URL(url),
    localStorage,
    sessionStorage: new MemoryStorage(),
    crypto: { randomUUID: () => "test-session-id" },
    history: {
      state: null,
      replaceState(_state, _title, nextUrl) {
        window.location = new URL(nextUrl, window.location);
      },
    },
    setTimeout,
    requestIdleCallback: undefined,
  };

  globalThis.window = window;
  globalThis.document = { referrer: "" };
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "ANCBuddy synthetic browser test" },
  });
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, status: 201 };
  };

  return { localStorage, requests, window };
}

const sourcePath = process.argv[2];
const compiledPath = "/private/tmp/ancbuddy-attribution-test.mjs";
const source = (await readFile(sourcePath, "utf8"))
  .replace(
    "import.meta.env.VITE_SUPABASE_URL",
    '"https://example.supabase.co"',
  )
  .replace("import.meta.env.VITE_SUPABASE_ANON_KEY", '"synthetic-anon-key"');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
await writeFile(compiledPath, compiled.outputText);

const moduleUrl = pathToFileURL(compiledPath).href;
const analytics = await import(moduleUrl);

const internalStorage = new MemoryStorage();
const enabled = browserContext(
  "https://ancbuddy.com/?ancbuddy_internal=1&utm_source=synthetic",
  internalStorage,
);
assert.equal(analytics.getAttributionPayload().is_internal, true);
assert.equal(enabled.window.location.search, "?utm_source=synthetic");
assert.equal(internalStorage.getItem("ancbuddy_internal_analytics_v1"), "1");
analytics.trackSiteEvent("page_view");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(enabled.requests[0].is_internal, true);

const restarted = browserContext("https://ancbuddy.com/download.html", internalStorage);
assert.equal(analytics.getAttributionPayload().is_internal, true);
analytics.trackSiteEvent("download_click");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(restarted.requests[0].is_internal, true);

const disabled = browserContext(
  "https://ancbuddy.com/?ancbuddy_internal=0",
  internalStorage,
);
assert.equal(analytics.getAttributionPayload().is_internal, false);
assert.equal(disabled.window.location.search, "");
assert.equal(internalStorage.getItem("ancbuddy_internal_analytics_v1"), null);
analytics.trackSiteEvent("page_view");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(disabled.requests[0].is_internal, false);

const external = browserContext("https://ancbuddy.com/");
assert.equal(analytics.getAttributionPayload().is_internal, false);
analytics.trackSiteEvent("page_view");
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(external.requests[0].is_internal, false);

console.log("internal marker browser-state tests passed");
