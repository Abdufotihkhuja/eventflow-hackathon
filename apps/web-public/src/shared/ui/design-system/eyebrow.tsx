import type { CSSProperties, ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  color?: string;
  align?: "start" | "center";
  style?: CSSProperties;
}

export const Eyebrow = ({
  children,
  color = "var(--fg-3)",
  align = "start",
  style,
}: EyebrowProps): React.ReactNode => (
  <div
    style={{
      font: "500 11px/1.4 var(--font-sans)",
      letterSpacing: "var(--track-eyebrow)",
      textTransform: "uppercase",
      color,
      textAlign: align === "center" ? "center" : "left",
      ...style,
    }}
  >
    {children}
  </div>
);

interface ItalicAccentProps {
  children: ReactNode;
  color?: string;
  fontFamily?: string;
}

export const ItalicAccent = ({
  children,
  color = "var(--ember-500)",
  fontFamily = "var(--font-display)",
}: ItalicAccentProps): React.ReactNode => (
  <span
    style={{
      fontFamily,
      fontWeight: 400,
      fontStyle: "italic",
      color,
      letterSpacing: "var(--track-tight)",
    }}
  >
    {children}
  </span>
);

interface SectionHeadProps {
  kicker?: ReactNode;
  title: ReactNode;
  italic?: ReactNode;
  right?: ReactNode;
  underline?: boolean;
}

export const SectionHead = ({
  kicker,
  title,
  italic,
  right,
  underline = false,
}: SectionHeadProps): React.ReactNode => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: 24,
      paddingBottom: underline ? 14 : 0,
      borderBottom: underline ? "2px solid var(--ink-400)" : undefined,
      flexWrap: "wrap",
      gap: 16,
    }}
  >
    <div>
      {kicker ? <Eyebrow style={{ marginBottom: 8 }}>{kicker}</Eyebrow> : null}
      <h2
        style={{
          font: "700 28px/1.05 var(--font-sans)",
          letterSpacing: "var(--track-snug)",
          margin: 0,
          color: "var(--ink-400)",
          textWrap: "balance",
        }}
      >
        {title}
        {italic ? (
          <>
            {" "}
            <ItalicAccent>{italic}</ItalicAccent>
          </>
        ) : null}
      </h2>
    </div>
    {right ? <div>{right}</div> : null}
  </div>
);
