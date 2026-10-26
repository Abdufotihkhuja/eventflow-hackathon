import type { CSSProperties, ReactNode } from "react";

import { cn } from "@shared/lib/utils";

import { Eyebrow } from "./eyebrow";

export interface MastheadMetaItem {
  key: ReactNode;
  value: ReactNode;
}

interface MastheadProps {
  /** Small uppercase prefix above the headline (e.g. "Issue 03 · Public events"). */
  eyebrow?: ReactNode;
  /** Main headline — pass JSX with `<ItalicAccent>` for the inflection phrase. */
  title: ReactNode;
  /** Lede paragraph below the title. */
  lede?: ReactNode;
  /** Right-side block — typically an image, mark, or stamp. */
  side?: ReactNode;
  /** Bottom meta-row of `{key, value}` pairs (Type · Accent · Canvas …). */
  meta?: MastheadMetaItem[];
  /** Additional class names for the outer wrapper. */
  className?: string;
  /** Inline styles for the outer wrapper. */
  style?: CSSProperties;
}

/**
 * Masthead — editorial section pattern.
 * Top 2px ink-400 underline, eyebrow row, headline, lede, optional meta-row.
 * Used for `about`, `organizers`, `blog index`, `privacy`, `terms`,
 * `organizer public profile`.
 */
export function Masthead({
  eyebrow,
  title,
  lede,
  side,
  meta,
  className,
  style,
}: MastheadProps): React.ReactNode {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-12 gap-y-6 pb-6 mb-14 border-b-2 border-ink-400",
        className
      )}
      style={style}
    >
      <div className="flex-1 min-w-[280px]">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1
          className="m-0 mt-2 text-ink-400"
          style={{
            font: "var(--w-bold) var(--text-3xl)/1.05 var(--font-sans)",
            letterSpacing: "var(--track-snug)",
            textWrap: "balance",
          }}
        >
          {title}
        </h1>
        {lede ? (
          <p
            className="mt-2 max-w-[64ch] text-ink-200"
            style={{
              font: "var(--w-regular) var(--text-sm)/1.55 var(--font-sans)",
              textWrap: "pretty",
            }}
          >
            {lede}
          </p>
        ) : null}
        {meta && meta.length > 0 ? (
          <dl className="flex flex-wrap gap-x-8 gap-y-3 mt-6 pt-6 border-t border-[var(--border-1)]">
            {meta.map((item, i) => (
              // eslint-disable-next-line react/no-array-index-key -- meta items are presentational, no stable id available
              <div key={i} className="flex flex-col gap-1">
                <dt
                  className="text-ink-100"
                  style={{
                    font: "var(--w-medium) 10px/1 var(--font-sans)",
                    letterSpacing: "var(--track-eyebrow)",
                    textTransform: "uppercase",
                  }}
                >
                  {item.key}
                </dt>
                <dd
                  className="m-0 text-ink-400"
                  style={{
                    font: "var(--w-semibold) var(--text-sm)/1.4 var(--font-sans)",
                  }}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
      {side ? <div className="shrink-0">{side}</div> : null}
    </header>
  );
}
