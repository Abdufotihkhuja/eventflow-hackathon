/**
 * Извлечение текста из TipTap/BlockNote блоков контента.
 * API событий и блога может возвращать description как массив блоков
 * с форматом { content: [{ text: string, type: "text" }] }.
 */

/** Блок контента (TipTap/BlockNote): paragraph, bulletListItem, heading и т.д. */
interface ContentBlock {
  content?: Array<{ text?: string; type?: string }>;
  children?: ContentBlock[];
  text?: string;
}

/**
 * Извлекает текст из массива блоков (формат API событий/блога).
 * Поддерживает:
 * - массив блоков напрямую (value as ContentBlock[])
 * - объект с полем blocks
 * - блоки с content[].text (TipTap) или children/text (ранний формат)
 */
export function extractTextFromBlocks(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object") return String(value);

  const blocks: ContentBlock[] = Array.isArray(value)
    ? (value as ContentBlock[])
    : Array.isArray((value as Record<string, unknown>).blocks)
      ? ((value as Record<string, unknown>).blocks as ContentBlock[])
      : [];

  if (blocks.length === 0) return "";

  const parts: string[] = [];

  for (const block of blocks) {
    // TipTap/BlockNote: content: [{ text: "...", type: "text" }]
    if (Array.isArray(block.content)) {
      for (const item of block.content) {
        if (item?.text && typeof item.text === "string") {
          parts.push(item.text);
        }
      }
      continue;
    }
    // Ранний формат: block.text или block.children[].text
    if (block.text && typeof block.text === "string") {
      parts.push(block.text);
      continue;
    }
    if (Array.isArray(block.children)) {
      for (const child of block.children) {
        if (child?.text && typeof child.text === "string") {
          parts.push(child.text);
        } else if (Array.isArray(child?.content)) {
          for (const c of child.content) {
            if (c?.text && typeof c.text === "string") parts.push(c.text);
          }
        }
      }
    }
  }

  return parts.join("\n").trim();
}
