import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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

await readFile(resolve(distDir, "404.html"), "utf8");
console.log(`Validated ${pages.length} generated SEO pages`);
