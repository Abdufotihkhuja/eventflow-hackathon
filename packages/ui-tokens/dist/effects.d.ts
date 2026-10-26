/**
 * Effect primitives: motion timing, elevation, and z-index.
 *
 * Shadows are expressed structurally (color/offset/opacity/radius) rather than
 * as CSS box-shadow strings, so a React Native consumer can map them to
 * `shadowColor`/`shadowOffset`/`shadowOpacity`/`shadowRadius`/`elevation` and a
 * web consumer can compose a box-shadow. Values approximate the cool, soft
 * `--shadow-*` set in `globals.css` (all based on ink-400).
 */
/** Animation durations in milliseconds. */
export declare const duration: {
    readonly fast: 120;
    readonly base: 200;
    readonly slow: 400;
    readonly slower: 700;
};
/** Easing curves as cubic-bezier control points [x1, y1, x2, y2]. */
export declare const easing: {
    readonly standard: readonly [0.2, 0, 0, 1];
    readonly out: readonly [0.16, 1, 0.3, 1];
};
/** Structured elevation tokens (ink-400 based, low opacity). */
export declare const shadow: {
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
    /** Warm ember glow for emphasis surfaces (tickets, primary CTAs). */
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
/** Stacking order scale. */
export declare const zIndex: {
    readonly base: 0;
    readonly sticky: 50;
    readonly overlay: 100;
    readonly modal: 200;
    readonly toast: 300;
};
export declare const effects: {
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
        /** Warm ember glow for emphasis surfaces (tickets, primary CTAs). */
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
};
export type Duration = typeof duration;
export type Easing = typeof easing;
export type Shadow = typeof shadow;
export type ZIndex = typeof zIndex;
export type Effects = typeof effects;
//# sourceMappingURL=effects.d.ts.map