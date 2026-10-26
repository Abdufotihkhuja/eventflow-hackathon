/**
 * Spacing + radii primitives, in px. Spacing follows the 4px base grid from
 * `globals.css`; keys mirror the `--space-*` scale (note the intentional gaps
 * at 7, 9, 11, …).
 */
/** 4px base grid. Keys are the multiples used across the design system. */
export declare const space: {
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
/** Corner radii. Sharp, modern editorial — `md` (6px) is the workhorse. */
export declare const radius: {
    readonly xs: 2;
    readonly sm: 4;
    readonly md: 6;
    readonly lg: 8;
    readonly xl: 12;
    readonly "2xl": 16;
    readonly pill: 999;
};
export type Space = typeof space;
export type Radius = typeof radius;
//# sourceMappingURL=spacing.d.ts.map