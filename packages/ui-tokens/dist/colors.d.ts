/**
 * EventFlow — bone-and-ink color primitives.
 *
 * Canonical source of truth, extracted verbatim from
 * `apps/web-public/src/app/globals.css` :root. Plain hex/rgba strings, no CSS
 * variables — so any runtime (React Native, NativeWind, web) can consume them.
 *
 * Bone canvas (cool off-white) · graphite ink · electric ember accent ·
 * forest secondary. Formal but young: high contrast, ember as accent only.
 */
/** Cool off-white canvas. 50 = pure white, 400 = divider. */
export declare const bone: {
    readonly 50: "#ffffff";
    readonly 100: "#fbfbfa";
    readonly 200: "#f5f5f3";
    readonly 300: "#ececea";
    readonly 400: "#dcdcda";
};
/** Graphite ink. 50 = placeholder, 400 = deepest ink. */
export declare const ink: {
    readonly 50: "#8a8a87";
    readonly 100: "#6f6f6c";
    readonly 200: "#4a4a47";
    readonly 300: "#2a2a28";
    readonly 400: "#0e0e0d";
};
/** Electric ember — the single brand accent. 400 = primary. */
export declare const ember: {
    readonly 50: "#fff3eb";
    readonly 100: "#ffe1cc";
    readonly 200: "#ffba85";
    readonly 300: "#fb893f";
    readonly 400: "#ea580c";
    readonly 500: "#c64a07";
    readonly 600: "#963405";
};
/** Forest — secondary editorial accent. 400 = secondary. */
export declare const forest: {
    readonly 50: "#eef3ef";
    readonly 100: "#d2e0d4";
    readonly 200: "#a4c0a8";
    readonly 300: "#6e9a76";
    readonly 400: "#3f7048";
    readonly 500: "#275235";
    readonly 600: "#173626";
};
/** Brand shortcuts (primary == ember-400). */
export declare const brand: {
    readonly primary: "#ea580c";
    readonly primaryHover: "#f26b25";
    readonly primaryPress: "#c64a07";
};
/** Status colors with their soft (background) pairings. */
export declare const status: {
    readonly success: "#1f7a3f";
    readonly successSoft: "#d8ebe0";
    readonly warning: "#b8860b";
    readonly warningSoft: "#f6e6bf";
    readonly danger: "#c2270e";
    readonly dangerHover: "#d83815";
    readonly dangerPress: "#971c08";
    readonly dangerSoft: "#f9d6cf";
    readonly info: "#3f7048";
    readonly infoSoft: "#d2e0d4";
};
/** Hairline borders over the bone canvas (ink at low opacity). */
export declare const border: {
    readonly subtle: "rgba(14, 14, 13, 0.08)";
    readonly default: "rgba(14, 14, 13, 0.16)";
    readonly strong: "rgba(14, 14, 13, 0.32)";
};
/** The full palette, grouped. */
export declare const palette: {
    readonly bone: {
        readonly 50: "#ffffff";
        readonly 100: "#fbfbfa";
        readonly 200: "#f5f5f3";
        readonly 300: "#ececea";
        readonly 400: "#dcdcda";
    };
    readonly ink: {
        readonly 50: "#8a8a87";
        readonly 100: "#6f6f6c";
        readonly 200: "#4a4a47";
        readonly 300: "#2a2a28";
        readonly 400: "#0e0e0d";
    };
    readonly ember: {
        readonly 50: "#fff3eb";
        readonly 100: "#ffe1cc";
        readonly 200: "#ffba85";
        readonly 300: "#fb893f";
        readonly 400: "#ea580c";
        readonly 500: "#c64a07";
        readonly 600: "#963405";
    };
    readonly forest: {
        readonly 50: "#eef3ef";
        readonly 100: "#d2e0d4";
        readonly 200: "#a4c0a8";
        readonly 300: "#6e9a76";
        readonly 400: "#3f7048";
        readonly 500: "#275235";
        readonly 600: "#173626";
    };
};
export type Bone = typeof bone;
export type Ink = typeof ink;
export type Ember = typeof ember;
export type Forest = typeof forest;
export type Palette = typeof palette;
//# sourceMappingURL=colors.d.ts.map