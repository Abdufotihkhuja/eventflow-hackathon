"use strict";
/**
 * @eventflow/ui-tokens
 *
 * Canonical, platform-agnostic design tokens for the EventFlow bone-and-ink
 * system. Plain TS objects only — no CSS, no build pipeline beyond `tsc`.
 *
 * - Web apps currently duplicate these values as CSS variables; migrating them
 *   to consume this package (and deleting the dupes) is a separate tech-debt
 *   task and intentionally out of scope here.
 * - The mobile app builds its NativeWind theme + JS theme object from these.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokens = void 0;
__exportStar(require("./colors"), exports);
__exportStar(require("./semantic"), exports);
__exportStar(require("./typography"), exports);
__exportStar(require("./spacing"), exports);
__exportStar(require("./effects"), exports);
const colors_1 = require("./colors");
const effects_1 = require("./effects");
const semantic_1 = require("./semantic");
const spacing_1 = require("./spacing");
const typography_1 = require("./typography");
/** Everything, in one tree — convenient for building a theme object. */
exports.tokens = {
    color: { ...colors_1.palette, brand: colors_1.brand, status: colors_1.status, border: colors_1.border },
    semantic: semantic_1.semantic,
    typography: typography_1.typography,
    space: spacing_1.space,
    radius: spacing_1.radius,
    ...effects_1.effects,
};
//# sourceMappingURL=index.js.map