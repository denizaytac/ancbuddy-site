import { readdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const distDir = resolve(siteRoot, "dist");
const contentDir = resolve(siteRoot, "content/pages");
const facts = JSON.parse(await readFile(resolve(siteRoot, "content/product-facts.json"), "utf8"));
const siteUrl = facts.siteUrl;
const expectedSupportEmail = "hello@ancbuddy.com";
const retiredSupportEmail = ["denoaytac62", "gmail.com"].join("@");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeReactText(value) {
  return escapeHtml(value).replaceAll("'", "&#x27;");
}

function parseFrontMatter(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/);
  assert(match, `${file} is missing front matter`);
  return JSON.parse(match[1]);
}

function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
      }),
    )
  ).flat();
}

for (const directory of ["content", "src", "scripts"]) {
  for (const file of await filesUnder(resolve(siteRoot, directory))) {
    const source = await readFile(file, "utf8");
    assert(!source.includes(retiredSupportEmail), `${file} contains the retired support email`);
  }
}

const pageFiles = (await readdir(contentDir)).filter((file) => file.endsWith(".md")).sort();
const pages = await Promise.all(
  pageFiles.map(async (file) => parseFrontMatter(await readFile(resolve(contentDir, file), "utf8"), file)),
);
const sitemap = await readFile(resolve(distDir, "sitemap.xml"), "utf8");
const urls = sitemapUrls(sitemap);
const uniqueUrls = new Set(urls);
assert(urls.length === uniqueUrls.size, "sitemap.xml contains duplicate URLs");
assert(
  facts.supportEmail === expectedSupportEmail,
  `product-facts.json supportEmail must be ${expectedSupportEmail}`,
);
assert(/^\d{4}-\d{2}-\d{2}$/.test(facts.homepageLastmod), "homepageLastmod must be YYYY-MM-DD");
for (const capability of [
  "activeSourceVisible",
  "otherConnectedSourcesVisible",
  "rememberedSourcesVisible",
  "rememberedSourceSwitching",
  "pairingControl",
  "multipointToggle",
  "macAudioRecovery",
]) {
  assert(
    typeof facts.capabilities?.[capability] === "boolean",
    `product-facts.json capabilities.${capability} must be a boolean`,
  );
}
assert(
  facts.capabilities.multipointToggle === false,
  "ANCBuddy must not advertise a Multipoint toggle",
);

const generatedFiles = ["index.html", "llms.txt", ...pages.map((page) => page.slug)];
const generatedContent = new Map(
  await Promise.all(
    generatedFiles.map(async (file) => [file, await readFile(resolve(distDir, file), "utf8")]),
  ),
);

for (const [file, content] of generatedContent) {
  assert(!content.includes(retiredSupportEmail), `${file} contains the retired support email`);
  for (const [, recipient] of content.matchAll(/mailto:([^?"'<\s]+)/g)) {
    assert(
      recipient === facts.supportEmail,
      `${file} contains an unexpected mailto recipient: ${recipient}`,
    );
  }
}

for (const file of ["index.html", "support.html", "troubleshooting.html", "privacy.html"]) {
  assert(
    generatedContent.get(file)?.includes(`mailto:${facts.supportEmail}`),
    `${file} is missing the support mailto link`,
  );
}

const homepage = generatedContent.get("index.html");
const homepageSchemas = [...homepage.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
  ([, json]) => JSON.parse(json),
);
const homepageFaq = homepageSchemas.find((schema) => schema["@type"] === "FAQPage");
assert(homepageFaq, "index.html is missing FAQPage JSON-LD");
assert(
  countMatches(homepage, /<details[^>]*class="faq-item"/g) === homepageFaq.mainEntity.length,
  "index.html visible FAQ count does not match FAQPage JSON-LD",
);
for (const item of homepageFaq.mainEntity) {
  assert(
    homepage.includes(`>${escapeReactText(item.name)}</span>`),
    `index.html is missing visible FAQ question: ${item.name}`,
  );
  assert(
    homepage.includes(`>${escapeReactText(item.acceptedAnswer.text)}</div>`),
    `index.html is missing visible FAQ answer: ${item.name}`,
  );
}

for (const page of pages) {
  const html = generatedContent.get(page.slug);
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
  const schemas = jsonScripts.map(([, json]) => JSON.parse(json));
  const faqSchema = schemas.find((schema) => schema["@type"] === "FAQPage");
  assert(faqSchema, `${page.slug} is missing FAQPage JSON-LD`);
  assert(
    faqSchema.mainEntity.length === page.faqs.length,
    `${page.slug} visible FAQ count does not match FAQPage JSON-LD`,
  );
  for (const [index, item] of page.faqs.entries()) {
    const schemaItem = faqSchema.mainEntity[index];
    assert(schemaItem.name === item.q, `${page.slug} FAQ question ${index + 1} differs from JSON-LD`);
    assert(
      schemaItem.acceptedAnswer?.text === item.a,
      `${page.slug} FAQ answer ${index + 1} differs from JSON-LD`,
    );
    assert(html.includes(`<h3>${escapeHtml(item.q)}</h3>`), `${page.slug} is missing visible FAQ question`);
    assert(html.includes(`<p>${escapeHtml(item.a)}</p>`), `${page.slug} is missing visible FAQ answer`);
  }
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
  `${siteUrl}/switch-bose-qc-ultra-audio-sources-mac.html`,
]) {
  assert(urls.includes(expected), `sitemap.xml missing ${expected}`);
}

const llms = generatedContent.get("llms.txt");
for (const expected of [
  "ANCBuddy",
  "download.html",
  "privacy.html",
  "support.html",
  "trust.html",
  "guides.html",
  "changelog.html",
  "facts.html",
  "switch-bose-qc-ultra-audio-sources-mac.html",
  facts.priceDisplay,
  facts.version,
  facts.supportEmail,
  "Bose QuietComfort Ultra Headphones Gen 1",
  "Bose QuietComfort Ultra Headphones Gen 2",
  "Bose QuietComfort Ultra Earbuds 2nd Gen",
  "not affiliated with, endorsed by, or sponsored by Bose Corporation",
]) {
  assert(llms.includes(expected), `llms.txt missing ${expected}`);
}

const distFiles = await filesUnder(distDir);
const distFileNames = new Set(
  distFiles.map((file) => relative(distDir, file).split(sep).join("/")),
);
const htmlByFile = new Map(
  await Promise.all(
    [...distFileNames]
      .filter((file) => file.endsWith(".html"))
      .map(async (file) => [file, await readFile(resolve(distDir, file), "utf8")]),
  ),
);
let internalLinkCount = 0;

for (const [file, html] of htmlByFile) {
  const pageUrl = file === "index.html" ? `${siteUrl}/` : `${siteUrl}/${file}`;
  for (const [, , rawHref] of html.matchAll(/<a\b[^>]*\bhref=(['"])(.*?)\1/g)) {
    const href = rawHref.replaceAll("&amp;", "&");
    let url;
    try {
      url = new URL(href, pageUrl);
    } catch {
      throw new Error(`${file} contains an invalid link: ${rawHref}`);
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== new URL(siteUrl).origin) {
      continue;
    }

    let target = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!target) target = "index.html";
    if (target.endsWith("/")) target += "index.html";
    assert(distFileNames.has(target), `${file} links to missing internal target: ${rawHref}`);

    const fragment = decodeURIComponent(url.hash.slice(1));
    if (fragment && fragment !== "trial" && target.endsWith(".html")) {
      assert(
        htmlByFile.get(target)?.includes(`id="${fragment}"`),
        `${file} links to missing #${fragment} in ${target}`,
      );
    }
    internalLinkCount += 1;
  }
}

const staticTrackingPages = new Map([
  ["download.html", generatedContent.get("download.html")],
  ["404.html", await readFile(resolve(distDir, "404.html"), "utf8")],
]);

for (const [file, html] of staticTrackingPages) {
  assert(html.includes("const ATTRIBUTION_VERSION = 2"), `${file} is missing attribution v2`);
  assert(html.includes("visitor_id: visitorId()"), `${file} is missing visitor_id`);
  assert(html.includes("first_utm_source"), `${file} is missing first-touch attribution`);
  assert(html.includes("last_utm_source"), `${file} is missing last-touch attribution`);
  assert(
    html.includes("apikey: SUPABASE_PUBLISHABLE_KEY"),
    `${file} is missing the publishable apikey header`,
  );
  assert(!html.includes("Authorization:"), `${file} must not send the publishable key as Bearer`);
  assert(countMatches(html, /track\("page_view"\);/g) === 1, `${file} must emit one pageview`);
}

console.log(`Validated ${pages.length} generated SEO pages and ${internalLinkCount} internal links`);
