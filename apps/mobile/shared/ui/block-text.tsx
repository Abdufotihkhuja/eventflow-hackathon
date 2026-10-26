/**
 * Minimal BlockNote renderer. The API's `description` is a structured document
 * (an array of blocks), not a string. We render the common blocks
 * (paragraph / heading / bullet & numbered list items) to RN text; unknown
 * blocks are skipped (never throws). Returns `null` when there's nothing to
 * render so the caller can fall back to `shortDescription` / an empty state.
 */
import { Fragment } from "react";
import { Text, View } from "react-native";

import { type, usePalette } from "@shared/theme";

interface InlineRun {
  type?: string;
  text?: string;
  styles?: { bold?: boolean; italic?: boolean };
}
interface Block {
  type?: string;
  props?: { level?: number };
  content?: InlineRun[];
}

function asBlocks(doc: unknown): Block[] {
  if (Array.isArray(doc)) return doc as Block[];
  return [];
}

function runText(content?: InlineRun[]): string {
  if (!Array.isArray(content)) return "";
  return content.map((r) => (typeof r?.text === "string" ? r.text : "")).join("");
}

export function BlockText({
  doc,
  fallback,
  color,
}: {
  doc: unknown;
  fallback?: string | null;
  color?: string;
}): React.JSX.Element | null {
  const p = usePalette();
  const c = color ?? p.fgDefault;

  const blocks = asBlocks(doc).filter((b) => runText(b.content).trim().length > 0);

  if (blocks.length === 0) {
    const text = fallback?.trim();
    if (!text) return null;
    return (
      <Text style={type({ weight: 400, size: 14.5, leading: 1.62, color: c })}>{text}</Text>
    );
  }

  let numbered = 0;
  return (
    <View style={{ gap: 10 }}>
      {blocks.map((b, i) => {
        const text = runText(b.content);
        if (b.type === "heading") {
          const level = b.props?.level ?? 2;
          const size = level <= 1 ? 18 : level === 2 ? 16 : 15;
          return (
            <Text key={i} style={[type({ role: "display", weight: 700, size, leading: 1.25, track: -0.02, color: p.fg }), { marginTop: i ? 6 : 0 }]}>
              {text}
            </Text>
          );
        }
        if (b.type === "bulletListItem" || b.type === "numberedListItem") {
          const isNum = b.type === "numberedListItem";
          numbered = isNum ? numbered + 1 : 0;
          const marker = isNum ? `${numbered}.` : "•";
          return (
            <View key={i} style={{ flexDirection: "row", gap: 8, paddingLeft: 2 }}>
              <Text style={type({ weight: 600, size: 14.5, leading: 1.62, color: p.fgMuted })}>{marker}</Text>
              <Text style={[type({ weight: 400, size: 14.5, leading: 1.62, color: c }), { flex: 1 }]}>{text}</Text>
            </View>
          );
        }
        // paragraph + any other text block
        numbered = 0;
        return (
          <Fragment key={i}>
            <Text style={type({ weight: 400, size: 14.5, leading: 1.62, color: c })}>{text}</Text>
          </Fragment>
        );
      })}
    </View>
  );
}
