import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const distDir = resolve(siteRoot, "dist");
const contentDir = resolve(siteRoot, "content/pages");
const factsPath = resolve(siteRoot, "content/product-facts.json");
const commercialModePath = resolve(siteRoot, "src/config/commercial-mode.json");
const siteUrl = "https://ancbuddy.com";
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

const facts = JSON.parse(await readFile(factsPath, "utf8"));
const { commercialMode } = JSON.parse(await readFile(commercialModePath, "utf8"));
if (commercialMode !== "active" && commercialMode !== "paused") {
  throw new Error(`Invalid commercial mode: ${commercialMode}`);
}
const isCommercialModeActive = commercialMode === "active";
const requiredFields = [
  "slug",
  "title",
  "description",
  "kind",
  "lastmod",
  "priority",
  "h1",
  "faqs",
  "breadcrumbs",
  "relatedLinks",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replaceAll("<", "\\u003c");
}

function parsePage(raw, file) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${file} is missing JSON front matter`);

  const meta = JSON.parse(match[1]);
  for (const field of requiredFields) {
    if (meta[field] === undefined) throw new Error(`${file} is missing ${field}`);
  }
  if (!meta.slug.endsWith(".html")) throw new Error(`${file} slug must end in .html`);
  if (!Array.isArray(meta.faqs) || meta.faqs.length < 1) {
    throw new Error(`${file} must include visible FAQs`);
  }
  if (!Array.isArray(meta.breadcrumbs) || meta.breadcrumbs.length < 2) {
    throw new Error(`${file} must include breadcrumbs`);
  }
  if (!Array.isArray(meta.relatedLinks) || meta.relatedLinks.length < 2) {
    throw new Error(`${file} must include at least two related links`);
  }

  const body = match[2].trim();
  if (!body) throw new Error(`${file} has no body content`);
  return { ...meta, body, canonical: `${siteUrl}/${meta.slug}` };
}

function pageType(kind) {
  if (kind === "guide") return "TechArticle";
  if (kind === "facts") return "AboutPage";
  if (kind === "privacy") return "PrivacyPolicy";
  return "WebPage";
}

function schemas(page) {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: page.breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`,
    })),
  };

  const main = {
    "@context": "https://schema.org",
    "@type": pageType(page.kind),
    headline: page.h1,
    name: page.title,
    description: page.description,
    url: page.canonical,
    datePublished: page.lastmod,
    dateModified: page.lastmod,
    mainEntityOfPage: page.canonical,
    author: {
      "@type": "Person",
      name: facts.developer.name,
      url: facts.developer.url,
    },
    publisher: {
      "@type": "Person",
      name: facts.developer.name,
      url: facts.developer.url,
    },
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const result = [breadcrumb, main, faq];
  if (page.kind === "download") {
    const softwareApplication = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: facts.name,
      operatingSystem: "macOS",
      applicationCategory: "UtilitiesApplication",
      softwareVersion: facts.version,
    };
    if (isCommercialModeActive) {
      softwareApplication.downloadUrl = facts.downloadUrl;
      softwareApplication.offers = {
        "@type": "Offer",
        price: facts.price,
        priceCurrency: facts.currency,
        availability: "https://schema.org/InStock",
        url: facts.checkoutUrl,
      };
    }
    result.push(softwareApplication);
  }
  return result;
}

function renderPage(page) {
  const bodyHtml = marked.parse(page.body);
  const sourceHtml = page.sources?.length
    ? `<section class="article-block references"><h2>References</h2><ul>${page.sources
        .map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a></li>`)
        .join("")}</ul></section>`
    : "";
  const relatedHtml = page.relatedLinks
    .map(
      (link) => `<a class="related-card" href="${escapeHtml(link.href)}">
        <strong>${escapeHtml(link.title)}</strong>
        <span>${escapeHtml(link.description)}</span>
      </a>`,
    )
    .join("");
  const faqHtml = page.faqs
    .map(
      (item) => `<div class="faq-row">
        <h3>${escapeHtml(item.q)}</h3>
        <p>${escapeHtml(item.a)}</p>
      </div>`,
    )
    .join("");
  const breadcrumbHtml = page.breadcrumbs
    .map((item, index) => {
      const label = escapeHtml(item.name);
      const sep = index < page.breadcrumbs.length - 1 ? '<span aria-hidden="true">/</span>' : "";
      return item.url && index < page.breadcrumbs.length - 1
        ? `<a href="${escapeHtml(item.url)}">${label}</a>${sep}`
        : `<span>${label}</span>${sep}`;
    })
    .join("");

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="${escapeHtml(page.description)}" />
  <meta name="theme-color" content="#0a0a0c" />
  <link rel="canonical" href="${page.canonical}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <meta property="og:type" content="${page.kind === "guide" ? "article" : "website"}" />
  <meta property="og:url" content="${page.canonical}" />
  <meta property="og:title" content="${escapeHtml(page.title)}" />
  <meta property="og:description" content="${escapeHtml(page.description)}" />
  <meta property="og:image" content="${siteUrl}/og-image-v2.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(page.title)}" />
  <meta name="twitter:description" content="${escapeHtml(page.description)}" />
  <meta name="twitter:image" content="${siteUrl}/og-image-v2.png" />
  <title>${escapeHtml(page.title)}</title>
  ${schemas(page)
    .map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`)
    .join("\n  ")}
  <style>${staticCss()}</style>
</head>
<body>
  <div class="page-bg"></div>
  ${staticNav()}
  <main class="article-shell">
    <nav class="breadcrumbs" aria-label="Breadcrumb">${breadcrumbHtml}</nav>
    <p class="eyebrow">${escapeHtml(labelForKind(page.kind))}</p>
    <h1>${escapeHtml(page.h1)}</h1>
    <p class="updated">Updated ${escapeHtml(page.lastmod)} · ${escapeHtml(facts.name)} ${escapeHtml(facts.version)}</p>
    <article class="article-card">${bodyHtml}</article>
    ${sourceHtml}
    <section class="article-block">
      <h2>Related pages</h2>
      <div class="related-grid">${relatedHtml}</div>
    </section>
    <section class="article-block faq-list">
      <h2>Questions, answered</h2>
      ${faqHtml}
    </section>
    <aside class="note">${escapeHtml(facts.independenceDisclaimer)}</aside>
  </main>
  ${staticFooter()}
  ${staticAttributionScript()}
</body>
</html>`;
}

function labelForKind(kind) {
  if (kind === "guide") return "Guide";
  if (kind === "download") return isCommercialModeActive ? "Download" : "Product";
  if (kind === "privacy") return "Privacy";
  if (kind === "support") return "Support";
  if (kind === "facts") return "Facts";
  if (kind === "trust") return "Trust";
  return "Resources";
}

function staticNav() {
  const finalLink = isCommercialModeActive
    ? '<a class="nav-link" href="/#pricing">Pricing</a>'
    : '<a class="nav-link" href="/#faq">FAQ</a>';
  const cta = isCommercialModeActive
    ? '<a class="nav-cta" href="/#trial">Try 14 days for free</a>'
    : '<a class="nav-cta" href="/#features">Explore features</a>';

  return `<nav class="nav">
    <div class="nav-inner">
      <a class="nav-brand" href="/">
        <span class="nav-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 12 a7 7 0 0 1 14 0" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"></path>
            <rect x="3" y="11" width="4.6" height="7" rx="2" fill="currentColor"></rect>
            <rect x="16.4" y="11" width="4.6" height="7" rx="2" fill="currentColor"></rect>
            <circle cx="9.5" cy="14.5" r="1.15" fill="var(--bg)"></circle>
            <circle cx="14.5" cy="14.5" r="1.15" fill="var(--bg)"></circle>
          </svg>
        </span>
        ANCBuddy
      </a>
      <div class="nav-links">
        <a class="nav-link" href="/#features">Features</a>
        <a class="nav-link" href="/#devices">Devices</a>
        <a class="nav-link" href="/guides.html">Guides</a>
        ${finalLink}
      </div>
      ${cta}
    </div>
  </nav>`;
}

function staticFooter() {
  const pricingLink = isCommercialModeActive ? '<a href="/#pricing">Pricing</a>' : "";
  const trialLink = isCommercialModeActive ? '<a href="/#trial">Free trial</a>' : "";

  return `<footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <a class="footer-brand" href="/"><img class="footer-logo" src="/logo-40.png" srcset="/logo-40.png 40w, /logo-80.png 80w" sizes="28px" alt="ANCBuddy" width="40" height="40" loading="lazy" decoding="async" />ANCBuddy</a>
          <p>A tiny menu-bar app for Bose QC Ultra, built for quick Mac control.</p>
        </div>
        <div class="footer-col">
          <div class="footer-heading">Product</div>
          <a href="/#features">Features</a>
          <a href="/#devices">Devices</a>
          ${pricingLink}
          <a href="/#faq">FAQ</a>
        </div>
        <div class="footer-col">
          <div class="footer-heading">Resources</div>
          <a href="/guides.html">Guides</a>
          <a href="/control-bose-qc-ultra-from-mac.html">Mac control guide</a>
          <a href="/support.html">Support</a>
          <a href="/trust.html">Trust</a>
          <a href="/privacy.html">Privacy</a>
          <a href="/facts.html">Facts</a>
          <a href="/changelog.html">Changelog</a>
          ${trialLink}
          <a href="mailto:${escapeHtml(facts.supportEmail)}">Contact</a>
        </div>
      </div>
      <div class="disclaimer">${escapeHtml(facts.independenceDisclaimer)}</div>
      <div class="footer-bottom">
        <span>© 2026 ANCBuddy · v${escapeHtml(facts.version)}</span>
        <span>Independent utility for compatible Bose hardware</span>
      </div>
    </div>
  </footer>`;
}

function staticCss() {
  return `
    @font-face {
      font-family: "Geist";
      font-style: normal;
      font-weight: 300 800;
      font-display: swap;
      src: url("/fonts/geist-latin.woff2") format("woff2");
    }
    @font-face {
      font-family: "Geist Mono";
      font-style: normal;
      font-weight: 400 500;
      font-display: swap;
      src: url("/fonts/geist-mono-latin.woff2") format("woff2");
    }
    @font-face {
      font-family: "Instrument Serif";
      font-style: italic;
      font-weight: 400;
      font-display: swap;
      src: url("/fonts/instrument-serif-italic-latin.woff2") format("woff2");
    }
    :root {
      color-scheme: dark;
      --accent: #a78bfa;
      --accent-2: #c4b5fd;
      --accent-glow: rgba(167, 139, 250, 0.28);
      --bg: #0a0a0c;
      --bg-2: #0f0f12;
      --surface: rgba(255,255,255,0.04);
      --surface-hi: rgba(255,255,255,0.07);
      --border: rgba(255,255,255,0.1);
      --border-hi: rgba(255,255,255,0.16);
      --fg: #f5f5f7;
      --fg-2: #c8c8d0;
      --fg-3: #8b8b95;
      --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      --font-mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
      --font-serif: "Instrument Serif", Georgia, serif;
      --pad-x: clamp(20px, 5vw, 64px);
      --radius: 14px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    html {
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      tab-size: 4;
      scrollbar-gutter: stable;
      overflow-y: scroll;
    }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--fg);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      overflow-x: hidden;
      font-feature-settings: "ss01", "cv11";
      letter-spacing: -0.011em;
    }
    html > body[data-scroll-locked] {
      margin-right: 0 !important;
    }
    .page-bg {
      position: fixed;
      inset: 0;
      z-index: -1;
      background:
        radial-gradient(900px 540px at 50% -10%, var(--accent-glow), transparent 62%),
        radial-gradient(700px 500px at 92% 20%, rgba(167,139,250,.08), transparent 70%),
        linear-gradient(180deg, var(--bg), var(--bg-2));
    }
    a { color: inherit; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .nav {
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 14px var(--pad-x);
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .nav-inner {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 8px 8px 18px;
      background: color-mix(in oklch, var(--bg) 70%, transparent);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      border: 1px solid var(--border);
      border-radius: 999px;
      box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,.3);
    }
    .container {
      width: 100%;
      max-width: 1240px;
      margin: 0 auto;
      padding-left: var(--pad-x);
      padding-right: var(--pad-x);
    }
    .nav-brand, .footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.02em;
      color: inherit;
      text-decoration: none;
    }
    .nav-brand {
      margin-right: 14px;
      padding-left: 2px;
      flex-shrink: 0;
    }
    .nav-brand:hover, .footer-brand:hover { text-decoration: none; }
    .nav-mark {
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      color: var(--accent);
      filter: drop-shadow(0 0 6px var(--accent-glow));
    }
    .nav-mark svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .footer-logo {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      display: block;
    }
    .footer-brand {
      margin-bottom: 16px;
    }
    .nav-links { display: flex; gap: 2px; }
    .nav-link {
      padding: 7px 12px;
      font-size: 13.5px;
      color: var(--fg-3);
      border-radius: 999px;
      transition: color .2s, background .2s;
    }
    .nav-link:hover { color: var(--fg); background: var(--surface-hi); text-decoration: none; }
    .nav-cta {
      padding: 8px 16px;
      background: var(--fg);
      color: var(--bg);
      border-radius: 999px;
      font-size: 13.5px;
      font-weight: 500;
      white-space: nowrap;
      flex-shrink: 0;
      transition: transform .2s, box-shadow .2s;
    }
    .nav-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255,255,255,0.15); text-decoration: none; }
    .article-shell {
      width: min(840px, calc(100% - 2 * var(--pad-x)));
      margin: 0 auto;
      padding: clamp(36px, 7vw, 80px) 0 clamp(72px, 12vw, 132px);
    }
    .breadcrumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--fg-3);
      font-family: var(--font-mono);
      font-size: 12px;
      margin-bottom: 28px;
    }
    .breadcrumbs a { color: var(--fg-2); }
    .eyebrow {
      margin: 0 0 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .12em;
      color: var(--accent-2);
    }
    h1 {
      margin: 0 0 16px;
      font-size: clamp(38px, 7vw, 72px);
      line-height: 1;
      letter-spacing: 0;
      font-weight: 600;
      text-wrap: balance;
    }
    .updated {
      margin: 0 0 28px;
      color: var(--fg-3);
      font-family: var(--font-mono);
      font-size: 12px;
    }
    .article-card, .article-block, .note {
      border: 1px solid var(--border);
      background: var(--surface);
      border-radius: 14px;
      padding: clamp(22px, 4vw, 38px);
      box-shadow: 0 24px 80px rgba(0,0,0,.26);
    }
    .article-block, .note { margin-top: 22px; }
    .article-card h2, .article-block h2 {
      margin: 38px 0 12px;
      font-size: clamp(24px, 4vw, 34px);
      line-height: 1.1;
      letter-spacing: 0;
    }
    .article-card h2:first-child, .article-block h2:first-child { margin-top: 0; }
    .article-card p:first-child {
      font-size: clamp(17px, 2vw, 20px);
      line-height: 1.6;
      color: var(--fg-2);
    }
    p, li {
      color: var(--fg-2);
      font-size: 16px;
      line-height: 1.7;
    }
    p { margin: 0 0 14px; }
    ul, ol { margin: 0 0 14px; padding-left: 1.25rem; }
    li + li { margin-top: 8px; }
    strong { color: var(--fg); }
    .article-card a, .article-block a { color: var(--accent-2); }
    .related-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .related-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
    }
    .related-card:hover { border-color: var(--border-hi); text-decoration: none; }
    .related-card span { color: var(--fg-3); font-size: 13px; line-height: 1.45; }
    .faq-row {
      border-top: 1px solid var(--border);
      padding: 18px 0;
    }
    .faq-row:first-of-type { border-top: 0; padding-top: 0; }
    .faq-row h3 { margin: 0 0 8px; font-size: 17px; }
    .faq-row p { margin: 0; color: var(--fg-3); }
    .note { color: var(--fg-3); font-size: 13px; line-height: 1.6; }
    .footer {
      border-top: 1px solid var(--border);
      margin-top: clamp(80px,10vw,140px);
      padding: 56px 0 40px;
      font-size: 13.5px;
      color: var(--fg-3);
    }
    .footer-grid {
      display: grid;
      grid-template-columns: 2fr repeat(2, 1fr);
      gap: 40px;
    }
    .footer-col p {
      margin: 0;
      color: var(--fg-3);
      font-size: 14px;
      line-height: 1.5;
      max-width: 36ch;
    }
    .footer-heading {
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #5a5a64;
      margin: 0 0 16px;
      font-family: var(--font-mono);
    }
    .footer-col a {
      display: block;
      padding: 4px 0;
      color: var(--fg-2);
      transition: color .2s;
      font-size: 13.5px;
    }
    .footer-col a:hover { color: var(--fg); }
    .disclaimer {
      margin-top: 24px;
      padding: 16px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 11.5px;
      line-height: 1.6;
      color: #5a5a64;
      font-family: var(--font-mono);
      background: var(--surface);
    }
    .footer-bottom {
      margin-top: 56px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #5a5a64;
      font-family: var(--font-mono);
    }
    @media (max-width: 760px) {
      .nav-links { display: none; }
      .nav { padding: 10px 12px; }
      .nav-inner { width: 100%; justify-content: space-between; padding: 6px 6px 6px 14px; gap: 6px; }
      .nav-brand { margin-right: 0; font-size: 14px; }
      .nav-cta { padding: 7px 14px; font-size: 13px; }
      .related-grid { grid-template-columns: 1fr; }
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .article-shell { width: min(100% - 32px, 840px); }
    }
    @media (max-width: 560px) {
      .footer-grid { grid-template-columns: 1fr; }
    }
  `;
}

function render404() {
  const downloadLink = isCommercialModeActive
    ? '<li><a href="/download.html">Download</a></li>'
    : '<li><a href="/#features">Features</a></li>';

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex" />
  <meta name="description" content="ANCBuddy page not found." />
  <title>Page not found - ANCBuddy</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <style>${staticCss()}</style>
</head>
<body>
  <div class="page-bg"></div>
  ${staticNav()}
  <main class="article-shell">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <article class="article-card">
      <p>This ANCBuddy page does not exist. Start from a stable product page below.</p>
      <ul>
        <li><a href="/">Homepage</a></li>
        <li><a href="/guides.html">Guides</a></li>
        ${downloadLink}
        <li><a href="/support.html">Support</a></li>
        <li><a href="/privacy.html">Privacy</a></li>
        <li><a href="/changelog.html">Changelog</a></li>
      </ul>
    </article>
  </main>
  ${staticFooter()}
  ${staticAttributionScript()}
</body>
</html>`;
}

function staticAttributionScript() {
  if (!isCommercialModeActive) return "";

  return `<script>
(() => {
  const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
  const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};
  const CHECKOUT_HOST = "ancbuddy.lemonsqueezy.com";
  const DOWNLOAD_URL = ${JSON.stringify(facts.downloadUrl)};
  const ATTRIBUTION_KEY = "ancbuddy_attribution_v1";
  const SESSION_ID_KEY = "ancbuddy_session_id_v1";
  const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

  function pathWithSearch() {
    return window.location.pathname + window.location.search;
  }

  function readStored() {
    try {
      const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeStored(value) {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));
    } catch {
      // Storage can be disabled; tracking must never block navigation.
    }
  }

  function sessionId() {
    try {
      const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
      if (existing) return existing;
      const next = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : "anc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
      window.sessionStorage.setItem(SESSION_ID_KEY, next);
      return next;
    } catch {
      return "anc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2);
    }
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try {
      const host = new URL(document.referrer).host;
      return host === window.location.host ? null : host;
    } catch {
      return null;
    }
  }

  function attribution() {
    const params = new URLSearchParams(window.location.search);
    const stored = readStored();
    const next = {
      ...stored,
      landing_path: stored.landing_path || pathWithSearch(),
      referrer_host: stored.referrer_host || referrerHost() || undefined,
    };
    for (const key of CAMPAIGN_KEYS) {
      const value = params.get(key);
      if (value) next[key] = value;
    }
    writeStored(next);
    return {
      session_id: sessionId(),
      utm_source: next.utm_source || null,
      utm_medium: next.utm_medium || null,
      utm_campaign: next.utm_campaign || null,
      referrer_host: next.referrer_host || null,
      landing_path: next.landing_path || pathWithSearch(),
      current_path: pathWithSearch(),
    };
  }

  function track(eventName, metadata) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
    const payload = {
      event_name: eventName,
      ...attribution(),
      metadata: metadata || {},
      user_agent: window.navigator.userAgent,
    };
    window.fetch(SUPABASE_URL.replace(/\\/$/, "") + "/rest/v1/site_events", {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  function checkoutUrl(href) {
    const url = new URL(href, window.location.href);
    const data = attribution();
    for (const [key, value] of Object.entries(data)) {
      if (value) url.searchParams.set("checkout[custom][" + key + "]", value);
    }
    return url.toString();
  }

  track("page_view");

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link) return;
    const href = link.getAttribute("href") || "";
    const url = new URL(href, window.location.href);

    if (url.host === CHECKOUT_HOST) {
      link.href = checkoutUrl(url.toString());
      track("checkout_click", { href: link.href, placement: "static_page" });
      return;
    }

    if (url.toString().startsWith(DOWNLOAD_URL)) {
      track("download_click", { href: url.toString(), placement: "static_page" });
      return;
    }

    if (href === "/#trial" || href === "#trial") {
      track("trial_open", { placement: "static_page" });
    }
  }, { capture: true });
})();
</script>`;
}

function sitemap(pages) {
  const entries = [
    { loc: `${siteUrl}/`, lastmod: "2026-07-02", priority: 1.0 },
    ...pages.map((page) => ({
      loc: page.canonical,
      lastmod: page.lastmod,
      priority: page.priority,
    })),
    { loc: `${siteUrl}/changelog.html`, lastmod: facts.releaseDate, priority: 0.6 },
  ].sort((a, b) => {
    if (a.loc === `${siteUrl}/`) return -1;
    if (b.loc === `${siteUrl}/`) return 1;
    return a.loc.localeCompare(b.loc);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
}

function llms(pages) {
  const links = pages
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((page) => `- [${page.title}](${page.canonical}): ${page.description}`)
    .join("\n");
  const devices = facts.supportedDevices.map((device) => `- ${device}`).join("\n");
  const features = facts.features.map((feature) => `- ${feature}`).join("\n");

  if (!isCommercialModeActive) {
    return `# ${facts.name}

> ${facts.description} The app supports ${facts.platform} on ${facts.architectures}.

## Canonical Links

- [Website](${facts.siteUrl}/)
- [Guides](${facts.siteUrl}/guides.html)
- [Support](${facts.siteUrl}/support.html)
- [Trust](${facts.siteUrl}/trust.html)
- [Privacy](${facts.siteUrl}/privacy.html)
- [Changelog](${facts.siteUrl}/changelog.html)
- [Facts](${facts.siteUrl}/facts.html)

## Product Facts

- Product: native Mac menu-bar utility for compatible Bose QC Ultra hardware.
- Documented version: ${facts.version}.
- Build: ${facts.build}.
- Platform: ${facts.platform} on ${facts.architectures}.
- Developer: ${facts.developer.name}.
- Support: ${facts.supportEmail}.
- AI Auto-EQ: ${facts.aiAutoEqPrivacy}
- Independence: ${facts.independenceDisclaimer}

## Supported Devices

${devices}

## Features

${features}

## Important Pages

${links}
`;
  }

  return `# ${facts.name}

> ${facts.description} The app supports ${facts.platform} on ${facts.architectures} and costs ${facts.priceDisplay} one-time after a ${facts.trial}.

## Canonical Links

- [Website](${facts.siteUrl}/)
- [Download](${facts.siteUrl}/download.html)
- [Guides](${facts.siteUrl}/guides.html)
- [Support](${facts.siteUrl}/support.html)
- [Trust](${facts.siteUrl}/trust.html)
- [Privacy](${facts.siteUrl}/privacy.html)
- [Changelog](${facts.siteUrl}/changelog.html)
- [Facts](${facts.siteUrl}/facts.html)
- [Checkout](${facts.checkoutUrl})
- [Download DMG](${facts.downloadUrl})

## Product Facts

- Product: native Mac menu-bar utility for compatible Bose QC Ultra hardware.
- Current version: ${facts.version}.
- Build: ${facts.build}.
- Platform: ${facts.platform} on ${facts.architectures}.
- Price: ${facts.priceDisplay} ${facts.currency} one-time license.
- Trial: ${facts.trial}.
- Developer: ${facts.developer.name}.
- Support: ${facts.supportEmail}.
- AI Auto-EQ: ${facts.aiAutoEqPrivacy}
- Independence: ${facts.independenceDisclaimer}

## Supported Devices

${devices}

## Features

${features}

## Important Pages

${links}
`;
}

async function loadPages() {
  const files = (await readdir(contentDir)).filter((file) => file.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (file) => parsePage(await readFile(resolve(contentDir, file), "utf8"), file)),
  );
}

const pages = await loadPages();
const slugs = new Set();
for (const page of pages) {
  if (slugs.has(page.slug)) throw new Error(`Duplicate SEO page slug: ${page.slug}`);
  slugs.add(page.slug);
  await writeFile(resolve(distDir, page.slug), renderPage(page));
}

await writeFile(resolve(distDir, "404.html"), render404());
await writeFile(resolve(distDir, "sitemap.xml"), sitemap(pages));
await writeFile(resolve(distDir, "llms.txt"), llms(pages));

console.log(`Generated ${pages.length} SEO pages, sitemap.xml, llms.txt, and 404.html`);
