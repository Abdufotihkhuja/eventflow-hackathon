#!/usr/bin/env node
/**
 * Regenerates the native splash image from assets/logo.svg:
 *   assets/splash-mark.png  512², the mark centred on transparent.
 *
 * The native splash paints the ink field itself (backgroundColor in
 * app.config.ts), so this asset carries only the mark — matching the JS
 * BrandSplash that takes over the moment React mounts.
 * Run from apps/mobile: node scripts/generate-splash.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sharp = require(path.resolve(root, "../../node_modules/sharp"));

const svg = fs.readFileSync(path.join(root, "assets", "logo.svg"), "utf8");
// Mark-only, square crop — same transform as scripts/generate-app-icons.js.
const mark = Buffer.from(
  svg
    .replace(/<path [^>]*\/>\s*/g, "")
    .replace('viewBox="0 0 565 126"', 'viewBox="0 0 126 126"')
    .replace('width="565" height="126"', 'width="126" height="126"'),
);

const CANVAS = 512;
const MARK = 512;

async function main() {
  const dot = await sharp(mark, { density: 72 * (MARK / 126) }).resize(MARK, MARK).png().toBuffer();
  const offset = Math.round((CANVAS - MARK) / 2);
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: dot, left: offset, top: offset }])
    .png()
    .toFile(path.join(root, "assets", "splash-mark.png"));
  console.log("assets/splash-mark.png regenerated");
}

main().catch((e) => { console.error(e); process.exit(1); });
