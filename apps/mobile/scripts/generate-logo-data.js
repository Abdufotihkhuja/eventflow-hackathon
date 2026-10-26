#!/usr/bin/env node
/**
 * Regenerates shared/ui/logo-data.ts from assets/logo.svg (the original
 * EventFlow logo — the same file web-public ships at /assets/logo.svg).
 * Run from apps/mobile: node scripts/generate-logo-data.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const svg = fs.readFileSync(path.join(root, "assets", "logo.svg"), "utf8");

// Full lockup (dot-swirl mark + "eventflow" text), as-is.
const full = svg.trim();

// Mark-only: drop the 9 text <path> elements and crop the viewBox to the mark
// square. The text paths use flat fills, so no gradient defs are orphaned.
const mark = full
  .replace(/<path [^>]*\/>\s*/g, "")
  .replace('viewBox="0 0 565 126"', 'viewBox="0 0 126 126"')
  .replace('width="565" height="126"', 'width="126" height="126"');

const out =
  "/**\n" +
  " * EventFlow brand SVG sources — GENERATED from assets/logo.svg (the original\n" +
  " * project logo, same file web-public ships). Do not hand-edit; re-run:\n" +
  " *   node scripts/generate-logo-data.js\n" +
  " */\n\n" +
  '/** Full lockup: dotted-swirl mark + "eventflow" wordmark (viewBox 565×126). */\n' +
  "export const LOGO_XML = " + JSON.stringify(full) + ";\n\n" +
  "/** Mark only: the dotted swirl, square crop (viewBox 126×126). */\n" +
  "export const MARK_XML = " + JSON.stringify(mark) + ";\n";

fs.writeFileSync(path.join(root, "shared", "ui", "logo-data.ts"), out);
console.log("shared/ui/logo-data.ts regenerated");
