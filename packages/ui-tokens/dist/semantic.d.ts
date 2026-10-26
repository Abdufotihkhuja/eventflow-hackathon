/** Surface backgrounds, lightest to most sunken. */
export declare const bg: {
    /** Default page canvas. */
    readonly 1: "#fbfbfa";
    /** Raised surface (cards on canvas). */
    readonly 2: "#ffffff";
    /** Sunken surface (wells, sidebars). */
    readonly 3: "#f5f5f3";
};
/** Foreground (text/icon) emphasis, strongest to faintest. */
export declare const fg: {
    /** Primary text / headings. */
    readonly 1: "#0e0e0d";
    /** Secondary text. */
    readonly 2: "#4a4a47";
    /** Meta / tertiary text. */
    readonly 3: "#6f6f6c";
    /** Placeholder / disabled. */
    readonly 4: "#8a8a87";
};
/** Semantic role map, ready to spread into a theme. */
export declare const semantic: {
    readonly bg: {
        /** Default page canvas. */
        readonly 1: "#fbfbfa";
        /** Raised surface (cards on canvas). */
        readonly 2: "#ffffff";
        /** Sunken surface (wells, sidebars). */
        readonly 3: "#f5f5f3";
    };
    readonly fg: {
        /** Primary text / headings. */
        readonly 1: "#0e0e0d";
        /** Secondary text. */
        readonly 2: "#4a4a47";
        /** Meta / tertiary text. */
        readonly 3: "#6f6f6c";
        /** Placeholder / disabled. */
        readonly 4: "#8a8a87";
    };
    readonly border: {
        readonly subtle: "rgba(14, 14, 13, 0.08)";
        readonly default: "rgba(14, 14, 13, 0.16)";
        readonly strong: "rgba(14, 14, 13, 0.32)";
    };
};
export type SemanticBg = typeof bg;
export type SemanticFg = typeof fg;
export type Semantic = typeof semantic;
//# sourceMappingURL=semantic.d.ts.map