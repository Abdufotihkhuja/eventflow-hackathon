/**
 * Typography primitives. Numeric where the value is platform-agnostic
 * (font sizes in px, line-height as unitless multipliers, weights as the
 * string values React Native's `fontWeight` accepts).
 *
 * `letterSpacing` is kept in `em` (as authored in `globals.css`) because that
 * is resolution-independent; consumers that need absolute px (React Native)
 * multiply by the relevant font size. Font *family names* are exported as
 * plain strings — actually loading the fonts is the consuming app's job.
 */
/** Font family names. The display face is Space Grotesk; body is Manrope. */
export declare const fontFamily: {
    readonly sans: "Manrope";
    readonly display: "Space Grotesk";
    readonly mono: "JetBrains Mono";
};
/** Type scale, in px. `display` is fluid on web (clamp); this is its ceiling. */
export declare const fontSize: {
    readonly xs: 12;
    readonly sm: 14;
    readonly base: 16;
    readonly md: 18;
    readonly lg: 20;
    readonly xl: 24;
    readonly "2xl": 30;
    readonly "3xl": 38;
    readonly "4xl": 48;
    readonly "5xl": 64;
    readonly "6xl": 84;
    readonly display: 132;
};
/** Weights as React-Native-compatible strings. */
export declare const fontWeight: {
    readonly light: "300";
    readonly regular: "400";
    readonly medium: "500";
    readonly semibold: "600";
    readonly bold: "700";
    readonly extrabold: "800";
};
/** Letter spacing in `em` (multiply by font size for RN absolute px). */
export declare const letterSpacing: {
    readonly tight: -0.035;
    readonly snug: -0.02;
    readonly normal: -0.01;
    readonly wide: 0.04;
    readonly eyebrow: 0.18;
};
/** Line height as unitless multipliers. */
export declare const lineHeight: {
    readonly tight: 1;
    readonly snug: 1.15;
    readonly normal: 1.5;
    readonly relaxed: 1.6;
};
export declare const typography: {
    readonly fontFamily: {
        readonly sans: "Manrope";
        readonly display: "Space Grotesk";
        readonly mono: "JetBrains Mono";
    };
    readonly fontSize: {
        readonly xs: 12;
        readonly sm: 14;
        readonly base: 16;
        readonly md: 18;
        readonly lg: 20;
        readonly xl: 24;
        readonly "2xl": 30;
        readonly "3xl": 38;
        readonly "4xl": 48;
        readonly "5xl": 64;
        readonly "6xl": 84;
        readonly display: 132;
    };
    readonly fontWeight: {
        readonly light: "300";
        readonly regular: "400";
        readonly medium: "500";
        readonly semibold: "600";
        readonly bold: "700";
        readonly extrabold: "800";
    };
    readonly letterSpacing: {
        readonly tight: -0.035;
        readonly snug: -0.02;
        readonly normal: -0.01;
        readonly wide: 0.04;
        readonly eyebrow: 0.18;
    };
    readonly lineHeight: {
        readonly tight: 1;
        readonly snug: 1.15;
        readonly normal: 1.5;
        readonly relaxed: 1.6;
    };
};
export type FontFamily = typeof fontFamily;
export type FontSize = typeof fontSize;
export type FontWeight = typeof fontWeight;
export type Typography = typeof typography;
//# sourceMappingURL=typography.d.ts.map