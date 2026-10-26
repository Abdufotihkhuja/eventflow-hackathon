#!/usr/bin/env node
/**
 * Regenerates the app icons from assets/logo.svg (the original EventFlow mark):
 *   assets/icon.png           1024², mark at 62% on the bone canvas (iOS + base)
 *   assets/adaptive-icon.png  1024², mark at 52% on transparent (Android
 *                             adaptive foreground — launchers mask/zoom, the
 *                             safe zone is the central ~66%)
 * Run from apps/mobile: node scripts/generate-app-icons.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sharp = require(path.resolve(root, "../../node_modules/sharp"));

const svg = fs.readFileSync(path.join(root, "assets", "logo.svg"), "utf8");
// Mark-only, square crop — same transform as scripts/generate-logo-data.js.
const mark = Buffer.from(
  svg
    .replace(/<path [^>]*\/>\s*/g, "")
    .replace('viewBox="0 0 565 126"', 'viewBox="0 0 126 126"')
    .replace('width="565" height="126"', 'width="126" height="126"'),
);

async function render(markPx, background, file) {
  const dot = await sharp(mark, { density: 72 * (markPx / 126) }).resize(markPx, markPx).png().toBuffer();
  const offset = Math.round((1024 - markPx) / 2);
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background } })
    .composite([{ input: dot, left: offset, top: offset }])
    .png()
    .toFile(path.join(root, "assets", file));
  console.log(`assets/${file} regenerated`);
}

async function main() {
  await render(640, "#FBFBFA", "icon.png");
  await render(532, { r: 0, g: 0, b: 0, alpha: 0 }, "adaptive-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
