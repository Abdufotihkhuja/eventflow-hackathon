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
export * from "./colors";
export * from "./semantic";
export * from "./typography";
export * from "./spacing";
export * from "./effects";
/** Everything, in one tree — convenient for building a theme object. */
export declare const tokens: {
    readonly duration: {
        readonly fast: 120;
        readonly base: 200;
        readonly slow: 400;
        readonly slower: 700;
    };
    readonly easing: {
        readonly standard: readonly [0.2, 0, 0, 1];
        readonly out: readonly [0.16, 1, 0.3, 1];
    };
    readonly shadow: {
        readonly xs: {
            readonly color: "#0e0e0d";
            readonly opacity: 0.05;
            readonly radius: 2;
            readonly offset: {
                readonly width: 0;
                readonly height: 1;
            };
            readonly elevation: 1;
        };
        readonly sm: {
            readonly color: "#0e0e0d";
            readonly opacity: 0.05;
            readonly radius: 6;
            readonly offset: {
                readonly width: 0;
                readonly height: 2;
            };
            readonly elevation: 2;
        };
        readonly md: {
            readonly color: "#0e0e0d";
            readonly opacity: 0.08;
            readonly radius: 16;
            readonly offset: {
                readonly width: 0;
                readonly height: 14;
            };
            readonly elevation: 6;
        };
        readonly lg: {
            readonly color: "#0e0e0d";
            readonly opacity: 0.12;
            readonly radius: 30;
            readonly offset: {
                readonly width: 0;
                readonly height: 32;
            };
            readonly elevation: 12;
        };
        readonly glowWarm: {
            readonly color: "#ea580c";
            readonly opacity: 0.4;
            readonly radius: 16;
            readonly offset: {
                readonly width: 0;
                readonly height: 12;
            };
            readonly elevation: 8;
        };
    };
    readonly zIndex: {
        readonly base: 0;
        readonly sticky: 50;
        readonly overlay: 100;
        readonly modal: 200;
        readonly toast: 300;
    };
    readonly color: {
        readonly brand: {
            readonly primary: "#ea580c";
            readonly primaryHover: "#f26b25";
            readonly primaryPress: "#c64a07";
        };
        readonly status: {
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
        readonly border: {
            readonly subtle: "rgba(14, 14, 13, 0.08)";
            readonly default: "rgba(14, 14, 13, 0.16)";
            readonly strong: "rgba(14, 14, 13, 0.32)";
        };
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
    readonly semantic: {
        readonly bg: {
            readonly 1: "#fbfbfa";
            readonly 2: "#ffffff";
            readonly 3: "#f5f5f3";
        };
        readonly fg: {
            readonly 1: "#0e0e0d";
            readonly 2: "#4a4a47";
            readonly 3: "#6f6f6c";
            readonly 4: "#8a8a87";
        };
        readonly border: {
            readonly subtle: "rgba(14, 14, 13, 0.08)";
            readonly default: "rgba(14, 14, 13, 0.16)";
            readonly strong: "rgba(14, 14, 13, 0.32)";
        };
    };
    readonly typography: {
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
    readonly space: {
        readonly 1: 4;
        readonly 2: 8;
        readonly 3: 12;
        readonly 4: 16;
        readonly 5: 20;
        readonly 6: 24;
        readonly 8: 32;
        readonly 10: 40;
        readonly 12: 48;
        readonly 16: 64;
        readonly 20: 80;
        readonly 24: 96;
        readonly 32: 128;
    };
    readonly radius: {
        readonly xs: 2;
        readonly sm: 4;
        readonly md: 6;
        readonly lg: 8;
        readonly xl: 12;
        readonly "2xl": 16;
        readonly pill: 999;
    };
};
export type Tokens = typeof tokens;
//# sourceMappingURL=index.d.ts.map