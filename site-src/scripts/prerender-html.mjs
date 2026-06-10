import { access, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, "..");
const indexPath = resolve(siteRoot, "dist/index.html");
const ssrDir = resolve(siteRoot, "dist-ssr");

async function firstExisting(paths) {
  for (const path of paths) {
    try {
      await access(path);
      return path;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error(`Could not find prerender bundle in ${ssrDir}`);
}

const bundlePath = await firstExisting([
  resolve(ssrDir, "prerender.js"),
  resolve(ssrDir, "prerender.mjs"),
]);

const { prerender } = await import(pathToFileURL(bundlePath).href);
const result = await prerender();

if (!result?.html) {
  throw new Error("Prerender script did not return HTML");
}

const indexHtml = await readFile(indexPath, "utf8");
if (!indexHtml.includes('<div id="root"></div>')) {
  throw new Error("Could not find empty root element in dist/index.html");
}

await writeFile(
  indexPath,
  indexHtml.replace('<div id="root"></div>', `<div id="root">${result.html}</div>`),
);
await rm(ssrDir, { recursive: true, force: true });
