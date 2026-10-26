/**
 * @module shared/ui/blog-content-blocks
 * @description Рендер контента статьи в формате BlockNote (heading, paragraph, image)
 * @see https://www.blocknotejs.org/docs
 */

"use client";

import React from "react";
import Image from "next/image";

/* eslint-disable import/no-restricted-paths */
import type {
  BlockNoteContentBlock,
  BlockNoteInlineContent,
} from "@/entities/blog";
/* eslint-enable import/no-restricted-paths */

import { cn, resolveMediaUrl } from "../../lib/utils";

function renderInlineContent(
  items: BlockNoteInlineContent[] | undefined
): React.ReactNode {
  if (!items?.length) return null;
  return (
    <>
      {items.map((item, i) => {
        const text = item.text ?? "";
        const styles = (item.styles ?? {}) as Record<string, boolean>;
        const parts = text.split("\n");
        let node: React.ReactNode =
          parts.length > 1 ? (
            <>
              {parts.map((part, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {part}
                </span>
              ))}
            </>
          ) : (
            text
          );
        if (styles.code)
          node = (
            <code
              key={`${i}-code`}
              className="rounded bg-bone-200 px-1.5 py-0.5 text-sm"
            >
              {node}
            </code>
          );
        if (styles.strikethrough) node = <s key={`${i}-s`}>{node}</s>;
        if (styles.underline) node = <u key={`${i}-u`}>{node}</u>;
        if (styles.italic) node = <em key={`${i}-em`}>{node}</em>;
        if (styles.bold) node = <strong key={`${i}-strong`}>{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

export interface BlogContentBlocksProps {
  blocks: BlockNoteContentBlock[];
  className?: string;
}

/** Группирует подряд идущие bulletListItem/numberedListItem в ul/ol */
function renderBlocks(
  blocks: BlockNoteContentBlock[],
  renderInline: typeof renderInlineContent
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const props = block.props ?? {};
    const id = String(block.id ?? "");

    if (block.type === "heading") {
      const level = Math.min(6, Math.max(1, Number(props.level) ?? 1));
      const textAlign = String(props.textAlignment ?? "left");
      const headingClass = cn(
        "mt-6 first:mt-0 scroll-mt-24 font-bold text-ink-400",
        textAlign === "center" && "text-center",
        textAlign === "right" && "text-right"
      );
      const content = renderInline(block.content);
      const headingProps = { id, className: headingClass };
      const H = { 1: "h1", 2: "h2", 3: "h3", 4: "h4", 5: "h5", 6: "h6" }[level] as
        | "h1"
        | "h2"
        | "h3"
        | "h4"
        | "h5"
        | "h6";
      result.push(
        React.createElement(H, { key: block.id, ...headingProps }, content)
      );
      i++;
      continue;
    }

    if (block.type === "paragraph") {
      const textAlign = String(props.textAlignment ?? "left");
      const content = renderInline(block.content);
      const isEmpty = !block.content?.length || !content;
      result.push(
        <p
          key={block.id}
          className={cn(
            "mt-4 first:mt-0 leading-relaxed text-ink-200",
            textAlign === "center" && "text-center",
            textAlign === "right" && "text-right",
            isEmpty && "min-h-[1.5em]"
          )}
        >
          {isEmpty ? "\u00A0" : content}
        </p>
      );
      i++;
      continue;
    }

    if (block.type === "image") {
      // BlockNote stores relative `/uploads/...` paths; without resolving to
      // the API origin next/image requests them from the web host → 404.
      const url = resolveMediaUrl(String(props.url ?? "")) ?? "";
      const caption = String(props.caption ?? "");
      const name = String(props.name ?? "");
      if (!url) {
        i++;
        continue;
      }
      result.push(
        <figure key={block.id} className="my-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-bone-200">
            <Image
              src={url}
              alt={name || caption || "Image"}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>
          {caption ? (
            <figcaption className="mt-2 text-center text-sm text-ink-100">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
      i++;
      continue;
    }

    if (block.type === "bulletListItem") {
      const group: BlockNoteContentBlock[] = [];
      while (i < blocks.length && blocks[i].type === "bulletListItem") {
        group.push(blocks[i]);
        i++;
      }
      result.push(
        <ul
          key={`list-${group[0]?.id ?? "0"}`}
          className="mt-4 first:mt-0 list-outside list-disc pl-6 space-y-1.5 text-ink-200"
        >
          {group.map((b) => (
            <li key={b.id} className="leading-relaxed pl-1">
              {renderInline(b.content) || "\u00A0"}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (block.type === "numberedListItem") {
      const group: BlockNoteContentBlock[] = [];
      while (i < blocks.length && blocks[i].type === "numberedListItem") {
        group.push(blocks[i]);
        i++;
      }
      result.push(
        <ol
          key={`list-${group[0]?.id ?? "0"}`}
          className="mt-4 first:mt-0 list-outside list-decimal pl-6 space-y-1.5 text-ink-200"
        >
          {group.map((b) => (
            <li key={b.id} className="leading-relaxed pl-1">
              {renderInline(b.content) || "\u00A0"}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const content = renderInline(block.content);
    result.push(
      <p key={block.id} className="mt-4 first:mt-0 leading-relaxed text-ink-200">
        {content || "\u00A0"}
      </p>
    );
    i++;
  }

  return result;
}

export function BlogContentBlocks({
  blocks,
  className,
}: BlogContentBlocksProps): React.ReactNode {
  if (!blocks?.length) return null;

  return (
    <div
      className={cn(
        "prose prose-lg prose-neutral max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:text-ink-400 prose-p:text-ink-200 prose-p:leading-relaxed prose-a:text-ember-500 prose-a:no-underline hover:prose-a:underline prose-strong:text-ink-400 prose-ul:text-ink-200 prose-ol:text-ink-200 prose-img:rounded-xl prose-img:shadow-lg [&>*:first-child]:mt-0",
        className
      )}
    >
      {renderBlocks(blocks, renderInlineContent)}
    </div>
  );
}
