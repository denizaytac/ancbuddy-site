import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const contentDir = resolve(siteRoot, "content/pages");
const facts = JSON.parse(
  await readFile(resolve(siteRoot, "content/product-facts.json"), "utf8"),
);

const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

function parsePage(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  assert(Boolean(match), `${file} has valid JSON front matter`);
  return {
    file,
    meta: JSON.parse(match[1]),
    body: match[2].trim(),
  };
}

function includesAll(page, phrases) {
  for (const phrase of phrases) {
    assert(
      page.body.includes(phrase),
      `${page.meta.slug} contains required intent phrase: ${phrase}`,
    );
  }
}

const pageFiles = (await readdir(contentDir))
  .filter((file) => file.endsWith(".md"))
  .sort();
const pages = await Promise.all(
  pageFiles.map(async (file) =>
    parsePage(await readFile(resolve(contentDir, file), "utf8"), file),
  ),
);
const pagesBySlug = new Map(pages.map((page) => [page.meta.slug, page]));

function page(slug) {
  const value = pagesBySlug.get(slug);
  assert(Boolean(value), `required intent page exists: ${slug}`);
  return value;
}

assert(
  new Set(pages.map((item) => item.meta.title)).size === pages.length,
  "all page titles are unique",
);
assert(
  new Set(pages.map((item) => item.meta.h1)).size === pages.length,
  "all page H1 headings are unique",
);
assert(
  !pages.some((item) => item.body.includes("ANCBuddy 2.1.0")),
  "no intent page contains the stale ANCBuddy 2.1.0 claim",
);

for (const capability of [
  "activeSourceVisible",
  "otherConnectedSourcesVisible",
  "rememberedSourcesVisible",
  "rememberedSourceSwitching",
  "pairingControl",
  "immersiveStillMotionControl",
  "multipointToggle",
  "cinemaModeControl",
  "granularEarbudBattery",
  "macAudioRecovery",
]) {
  assert(
    typeof facts.capabilities?.[capability] === "boolean",
    `product facts define capabilities.${capability}`,
  );
}
assert(
  facts.capabilities.multipointToggle === false,
  "ANCBuddy does not advertise a Multipoint toggle",
);
assert(
  facts.capabilities.cinemaModeControl === false,
  "ANCBuddy does not advertise Cinema Mode control",
);
assert(
  facts.capabilities.granularEarbudBattery === false,
  "ANCBuddy does not advertise granular earbud and case battery values",
);

const macApp = page("bose-qc-ultra-mac-app.html");
assert(
  macApp.meta.title.includes("Features, Price & Free Trial"),
  "Mac app page title signals commercial evaluation intent",
);
includesAll(macApp, [
  "## Decide in 30 seconds",
  "## What ANCBuddy does not replace",
  "## Who ANCBuddy is for",
  "It is not a good fit",
  "14-day free trial",
  "$9.99 once",
  "Cinema Mode",
]);

const control = page("control-bose-qc-ultra-from-mac.html");
includesAll(control, [
  "## What macOS can do natively",
  "## How to manage Bose QC Ultra audio sources from your Mac",
  "## Source terms in plain English",
]);

const comparison = page("bose-music-app-for-mac-alternative.html");
includesAll(comparison, [
  "## macOS vs ANCBuddy",
  "## Where ANCBuddy is useful",
  "## Where the Bose app remains the better tool",
]);

const sources = page("switch-bose-qc-ultra-audio-sources-mac.html");
includesAll(sources, [
  "## Active Source vs. Other Connected Sources",
  "## Remembered devices",
  "## Start or cancel pairing",
  "## Multipoint, simply explained",
  "## Mac-audio recovery",
]);

const troubleshooting = page("troubleshooting.html");
assert(
  troubleshooting.body.length >= 5000,
  "troubleshooting page provides substantial diagnostic depth",
);
includesAll(troubleshooting, [
  "## Match the symptom first",
  "## Bose QC Ultra is connected but not showing in ANCBuddy",
  "## ANCBuddy controls work, but no sound comes from the Bose",
  "## A remembered source will not connect",
  "## The phone keeps taking over, or the wrong source becomes active",
  "## Pairing starts but does not complete",
  "## Battery or source status is stale",
]);

const immersive = page("bose-qc-ultra-immersive-audio-mac.html");
assert(
  immersive.body.includes(`ANCBuddy ${facts.version}`),
  "Immersive Audio page matches the current product version",
);
includesAll(immersive, [
  "## Still, Motion, and Cinema at a glance",
  "## Cinema Mode on Bose QC Ultra Gen 2",
  "Cinema Mode control",
  "use the Bose app",
]);

const autoEq = page("ai-auto-eq-bose-qc-ultra.html");
includesAll(autoEq, [
  "Bose QC Ultra EQ",
  "system-wide audio processor",
  "## What AI Auto-EQ is — and is not",
  "## Privacy behavior",
  "## Limits to understand before using it",
]);

const headphones = page("qc-ultra-headphones-gen-2-mac.html");
assert(
  headphones.body.includes(`ANCBuddy ${facts.version}`),
  "Headphones Gen 2 page matches the current product version",
);
includesAll(headphones, [
  "## What is specific to Gen 2",
  "does not advertise Cinema Mode control",
  "## Gen 1 versus Gen 2 inside ANCBuddy",
]);

const earbuds = page("qc-ultra-earbuds-2nd-gen-mac.html");
assert(
  earbuds.body.includes(`ANCBuddy ${facts.version}`),
  "Earbuds 2nd Gen page matches the current product version",
);
includesAll(earbuds, [
  "## Earbuds-specific limits",
  "does not claim separate left-earbud, right-earbud, and case values",
  "## Source switching and Multipoint",
]);

const guides = page("guides.html");
includesAll(guides, [
  "## Choose and install ANCBuddy",
  "## Use Bose QC Ultra from the Mac menu bar",
  "## Switch sources and manage connections",
  "## Change sound and listening modes",
  "## Fix a problem",
  "This one page owns the source-switching cluster",
]);

console.log(`Validated ${checks.length} intent-quality gates across ${pages.length} pages`);
