import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const repoRoot = resolve(siteRoot, "..");
const changelogPath = resolve(repoRoot, "CHANGELOG.md");
const outputPath = resolve(siteRoot, "dist/changelog.html");

const markdown = await readFile(changelogPath, "utf8");
const body = marked.parse(markdown);

const html = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="description" content="ANCBuddy release notes for the Mac menu-bar app for Bose QC Ultra headphones and earbuds." />
  <meta name="theme-color" content="#0a0a0c" />
  <link rel="canonical" href="https://ancbuddy.com/changelog.html" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <title>ANCBuddy Changelog</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0a0a0c;
      --surface: #141417;
      --surface-hi: #1d1d22;
      --fg: #f8fafc;
      --fg-2: #cbd5e1;
      --fg-3: #94a3b8;
      --border: rgba(148, 163, 184, 0.24);
      --accent: #a7f3d0;
      font-family: Geist, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--fg);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(167, 243, 208, 0.14), transparent 36rem),
        linear-gradient(180deg, #0a0a0c 0%, #111116 100%);
      color: var(--fg);
    }
    main {
      width: min(760px, calc(100% - 40px));
      margin: 0 auto;
      padding: 56px 0 72px;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
      color: var(--fg-2);
      font-size: 14px;
    }
    article {
      border: 1px solid var(--border);
      background: rgba(20, 20, 23, 0.72);
      border-radius: 8px;
      padding: clamp(24px, 5vw, 48px);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
    }
    h1 {
      margin: 0 0 28px;
      font-size: clamp(36px, 7vw, 64px);
      line-height: 0.95;
      letter-spacing: 0;
    }
    h2 {
      margin: 40px 0 12px;
      padding-top: 28px;
      border-top: 1px solid var(--border);
      font-size: clamp(24px, 4vw, 32px);
      line-height: 1.1;
      letter-spacing: 0;
    }
    h2:first-of-type {
      margin-top: 0;
      padding-top: 0;
      border-top: 0;
    }
    strong { color: var(--fg); }
    p, li {
      color: var(--fg-2);
      font-size: 16px;
      line-height: 1.7;
    }
    ul {
      margin: 12px 0 0;
      padding-left: 1.25rem;
    }
    li + li { margin-top: 8px; }
  </style>
</head>
<body>
  <main>
    <a class="back" href="/">Back to ANCBuddy</a>
    <article>
      ${body}
    </article>
  </main>
</body>
</html>
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html);
