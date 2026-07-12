import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("dist");
const html = await readFile(resolve(dist, "ceo/index.html"), "utf8");
const manifest = JSON.parse(
  await readFile(resolve(dist, "ceo/manifest.webmanifest"), "utf8"),
);

for (const expected of [
  'rel="manifest"',
  "/ceo/manifest.webmanifest",
  'rel="apple-touch-icon"',
  "/ceo/icons/icon-180.png",
]) {
  if (!html.includes(expected)) throw new Error(`CEO HTML is missing ${expected}`);
}

for (const [field, expected] of Object.entries({
  id: "/ceo/",
  start_url: "/ceo/",
  scope: "/ceo/",
  display: "standalone",
})) {
  if (manifest[field] !== expected) {
    throw new Error(`CEO manifest ${field} must be ${expected}`);
  }
}

const requiredIcons = new Map([
  ["180x180", "icon-180.png"],
  ["192x192", "icon-192.png"],
  ["512x512", "icon-512.png"],
]);

for (const [size, filename] of requiredIcons) {
  const icon = manifest.icons.find(
    (candidate) => candidate.sizes === size && candidate.purpose === "any",
  );
  if (!icon || !new URL(icon.src, "https://ancbuddy.com").pathname.endsWith(filename)) {
    throw new Error(`CEO manifest is missing ${size}`);
  }
  await validatePng(resolve(dist, "ceo/icons", filename), Number.parseInt(size, 10));
}

const maskable = manifest.icons.find(
  (candidate) => candidate.sizes === "512x512" && candidate.purpose === "maskable",
);
if (!maskable || !new URL(maskable.src, "https://ancbuddy.com").pathname.endsWith("icon-512-maskable.png")) {
  throw new Error("CEO manifest is missing its maskable icon");
}
await validatePng(resolve(dist, "ceo/icons/icon-512-maskable.png"), 512);
await validatePng(resolve(dist, "ceo/icons/favicon-32.png"), 32);

console.log("Validated CEO password PWA shell and icon set");

async function validatePng(path, expectedSize) {
  const png = await readFile(path);
  const signature = png.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") throw new Error(`${path} is not a PNG`);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== expectedSize || height !== expectedSize) {
    throw new Error(`${path} must be ${expectedSize}x${expectedSize}`);
  }
}
