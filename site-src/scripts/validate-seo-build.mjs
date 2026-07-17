import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const distDir = resolve(siteRoot, "dist");
const contentDir = resolve(siteRoot, "content/pages");
const facts = JSON.parse(await readFile(resolve(siteRoot, "content/product-facts.json"), "utf8"));
const { commercialMode } = JSON.parse(
  await readFile(resolve(siteRoot, "src/config/commercial-mode.json"), "utf8"),
);
const isCommercialModeActive = commercialMode === "active";
const siteUrl = facts.siteUrl;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function parseFrontMatter(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, `${file} is missing front matter`);
  return JSON.parse(match[1]);
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

const pageFiles = (await readdir(contentDir)).filter((file) => file.endsWith(".md")).sort();
const pages = await Promise.all(
  pageFiles.map(async (file) => parseFrontMatter(await readFile(resolve(contentDir, file), "utf8"), file)),
);
const sitemap = await readFile(resolve(distDir, "sitemap.xml"), "utf8");
const urls = sitemapUrls(sitemap);
const uniqueUrls = new Set(urls);
assert(urls.length === uniqueUrls.size, "sitemap.xml contains duplicate URLs");

for (const page of pages) {
  const html = await readFile(resolve(distDir, page.slug), "utf8");
  const canonical = `${siteUrl}/${page.slug}`;

  assert(countMatches(html, /<title>[\s\S]*?<\/title>/g) === 1, `${page.slug} must have one title`);
  assert(
    countMatches(html, /<meta name="description" content="[^"]+"/g) === 1,
    `${page.slug} must have one meta description`,
  );
  assert(
    countMatches(html, /<link rel="canonical" href="[^"]+"/g) === 1,
    `${page.slug} must have one canonical`,
  );
  assert(countMatches(html, /<h1>[\s\S]*?<\/h1>/g) === 1, `${page.slug} must have one H1`);
  assert(html.includes(`href="${canonical}"`), `${page.slug} canonical URL is wrong`);
  assert(urls.includes(canonical), `${page.slug} is missing from sitemap.xml`);

  const jsonScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert(jsonScripts.length >= 2, `${page.slug} must include JSON-LD`);
  for (const [, json] of jsonScripts) JSON.parse(json);
}

for (const expected of [
  `${siteUrl}/`,
  `${siteUrl}/download.html`,
  `${siteUrl}/privacy.html`,
  `${siteUrl}/support.html`,
  `${siteUrl}/trust.html`,
  `${siteUrl}/guides.html`,
  `${siteUrl}/changelog.html`,
  `${siteUrl}/facts.html`,
]) {
  assert(urls.includes(expected), `sitemap.xml missing ${expected}`);
}

const llms = await readFile(resolve(distDir, "llms.txt"), "utf8");
const requiredLlmsContent = [
  "ANCBuddy",
  "download.html",
  "privacy.html",
  "support.html",
  "trust.html",
  "guides.html",
  "changelog.html",
  "facts.html",
  facts.version,
  "Bose QuietComfort Ultra Headphones Gen 1",
  "Bose QuietComfort Ultra Headphones Gen 2",
  "Bose QuietComfort Ultra Earbuds 2nd Gen",
  "not affiliated with, endorsed by, or sponsored by Bose Corporation",
];
if (isCommercialModeActive) requiredLlmsContent.push(facts.priceDisplay);

for (const expected of requiredLlmsContent) {
  assert(llms.includes(expected), `llms.txt missing ${expected}`);
}

if (!isCommercialModeActive) {
  const publicTextFiles = [
    "index.html",
    "404.html",
    "changelog.html",
    "llms.txt",
    ...pages.map((page) => page.slug),
  ];
  const forbiddenPatterns = [
    /ancbuddy\.lemonsqueezy\.com/i,
    /releases\/download\/[^\s"')]+\.dmg/i,
    /\$9\.99/i,
    /free trial/i,
    /checkout/i,
    /trial_signups/i,
    /site_events/i,
    /VITE_SUPABASE/i,
  ];

  for (const file of publicTextFiles) {
    const content = await readFile(resolve(distDir, file), "utf8");
    for (const pattern of forbiddenPatterns) {
      assert(!pattern.test(content), `${file} contains paused-mode commercial or tracking content: ${pattern}`);
    }
  }
}

await readFile(resolve(distDir, "404.html"), "utf8");
console.log(`Validated ${pages.length} generated SEO pages`);
