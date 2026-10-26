"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.semantic = exports.fg = exports.bg = void 0;
/**
 * Semantic role tokens — resolved to concrete values (not CSS var references,
 * which is how the web layer wires them). These mirror the `--bg-*`, `--fg-*`
 * role aliases in `globals.css` so screens reference intent, not raw shades.
 */
const colors_1 = require("./colors");
/** Surface backgrounds, lightest to most sunken. */
exports.bg = {
    /** Default page canvas. */
    1: colors_1.bone[100],
    /** Raised surface (cards on canvas). */
    2: colors_1.bone[50],
    /** Sunken surface (wells, sidebars). */
    3: colors_1.bone[200],
};
/** Foreground (text/icon) emphasis, strongest to faintest. */
exports.fg = {
    /** Primary text / headings. */
    1: colors_1.ink[400],
    /** Secondary text. */
    2: colors_1.ink[200],
    /** Meta / tertiary text. */
    3: colors_1.ink[100],
    /** Placeholder / disabled. */
    4: colors_1.ink[50],
};
/** Semantic role map, ready to spread into a theme. */
exports.semantic = { bg: exports.bg, fg: exports.fg, border: colors_1.border };
//# sourceMappingURL=semantic.js.map