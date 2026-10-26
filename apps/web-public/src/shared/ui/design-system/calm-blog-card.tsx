"use client";

import type { CSSProperties, MouseEvent } from "react";

import Image from "next/image";

import { Eyebrow } from "./eyebrow";

export type CalmBlogCardVariant = "default" | "list" | "compact";

export interface CalmBlogCardData {
  title: string;
  excerpt?: string;
  coverImage: string;
  categoryLabel: string;
  date: string;
  readTime: string;
  authorName: string;
  authorAvatar?: string;
  trending?: boolean;
}

interface CalmBlogCardProps {
  post: CalmBlogCardData;
  href?: string;
  variant?: CalmBlogCardVariant;
  trendingLabel?: string;
  onClick?: () => void;
}

const baseAnchor: CSSProperties = {
  cursor: "pointer",
  textDecoration: "none",
  color: "inherit",
};

const fallbackAvatar = (name: string): string =>
  name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function CalmBlogCard({
  post,
  href,
  variant = "default",
  trendingLabel = "Trending",
  onClick,
}: CalmBlogCardProps): React.ReactNode {
  const handleClick = onClick
    ? (e: MouseEvent<HTMLAnchorElement>) => {
        if (!href) e.preventDefault();
        onClick();
      }
    : undefined;

  if (variant === "list") {
    return (
      <a
        href={href ?? "#"}
        onClick={handleClick}
        style={{
          ...baseAnchor,
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 20,
          padding: 14,
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          borderRadius: 8,
          transition: "border-color 200ms, box-shadow 200ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--border-2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-1)";
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16/10",
            borderRadius: 6,
            overflow: "hidden",
            background: "var(--bone-300)",
          }}
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="180px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Eyebrow color="var(--ember-500)">{post.categoryLabel}</Eyebrow>
            {post.trending ? (
              <span
                style={{
                  font: "500 10px/1 var(--font-mono)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ember-500)",
                  background: "var(--ember-50)",
                  borderRadius: 999,
                  padding: "4px 8px",
                }}
              >
                {trendingLabel}
              </span>
            ) : null}
          </div>
          <div
            style={{
              font: "700 18px/1.25 var(--font-sans)",
              letterSpacing: "-0.015em",
              color: "var(--fg-1)",
              marginBottom: 6,
              textWrap: "balance",
            }}
          >
            {post.title}
          </div>
          {post.excerpt ? (
            <p
              style={{
                font: "400 14px/1.55 var(--font-sans)",
                color: "var(--fg-2)",
                margin: 0,
                marginBottom: 14,
                textWrap: "pretty",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {post.excerpt}
            </p>
          ) : null}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              font: "500 12px/1 var(--font-mono)",
              color: "var(--fg-3)",
              letterSpacing: "0.04em",
            }}
          >
            <span>{post.authorName.toUpperCase()}</span>
            <span aria-hidden>·</span>
            <span>{post.date}</span>
            <span aria-hidden>·</span>
            <span>{post.readTime}</span>
          </div>
        </div>
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={href ?? "#"}
        onClick={handleClick}
        style={{
          ...baseAnchor,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-2)",
          border: "1px solid var(--border-1)",
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 200ms cubic-bezier(0.2,0,0,1), box-shadow 200ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16/10",
            background: "var(--bone-300)",
          }}
        >
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div style={{ padding: 14 }}>
          <Eyebrow style={{ marginBottom: 8 }} color="var(--ember-500)">
            {post.categoryLabel}
          </Eyebrow>
          <div
            style={{
              font: "700 15px/1.25 var(--font-sans)",
              letterSpacing: "-0.015em",
              color: "var(--fg-1)",
              marginBottom: 8,
              textWrap: "balance",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.title}
          </div>
          <div
            style={{
              font: "500 11px/1 var(--font-mono)",
              color: "var(--fg-3)",
              letterSpacing: "0.04em",
            }}
          >
            {post.date} · {post.readTime}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={href ?? "#"}
      onClick={handleClick}
      style={{
        ...baseAnchor,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: 8,
        overflow: "hidden",
        transition: "transform 200ms cubic-bezier(0.2,0,0,1), box-shadow 200ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          position: "relative",
          aspectRatio: "4/3",
          background: "var(--bone-300)",
        }}
      >
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
        />
        {post.trending ? (
          <span
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              font: "500 10px/1 var(--font-mono)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--bone-50)",
              background: "var(--ember-400)",
              borderRadius: 999,
              padding: "5px 10px",
            }}
          >
            {trendingLabel}
          </span>
        ) : null}
      </div>
      <div
        style={{
          padding: "16px 18px 18px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <Eyebrow style={{ marginBottom: 10 }} color="var(--ember-500)">
          {post.categoryLabel}
        </Eyebrow>
        <div
          style={{
            font: "700 18px/1.25 var(--font-sans)",
            letterSpacing: "-0.015em",
            color: "var(--fg-1)",
            marginBottom: 8,
            textWrap: "balance",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {post.title}
        </div>
        {post.excerpt ? (
          <p
            style={{
              font: "400 14px/1.55 var(--font-sans)",
              color: "var(--fg-2)",
              margin: 0,
              marginBottom: 16,
              textWrap: "pretty",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {post.excerpt}
          </p>
        ) : null}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingTop: 14,
            borderTop: "1px dashed var(--border-1)",
          }}
        >
          {post.authorAvatar ? (
            <span
              style={{
                position: "relative",
                width: 28,
                height: 28,
                borderRadius: "50%",
                overflow: "hidden",
                background: "var(--bone-300)",
                flexShrink: 0,
              }}
            >
              <Image
                src={post.authorAvatar}
                alt={post.authorName}
                fill
                sizes="28px"
                style={{ objectFit: "cover" }}
              />
            </span>
          ) : (
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--ember-300)",
                color: "var(--bone-50)",
                font: "700 11px/1 var(--font-sans)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {fallbackAvatar(post.authorName)}
            </span>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                font: "600 12px/1.2 var(--font-sans)",
                color: "var(--fg-1)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {post.authorName}
            </div>
            <div
              style={{
                font: "500 10px/1 var(--font-mono)",
                color: "var(--fg-3)",
                letterSpacing: "0.04em",
                marginTop: 3,
              }}
            >
              {post.date} · {post.readTime}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
