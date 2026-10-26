"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalizedLink as Link } from "@shared/ui/localized-link";
import Image from "next/image";

import { useT } from "@eventflow/i18n/react";
import { useInView } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Linkedin,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  formatPublishDate,
  formatReadTime,
  getCategoryLabel,
  getTagLabel,
} from "@entities/blog";
import { isAuthenticated } from "@shared/lib/apiClient";
import {
  getBlogInteractionErrorMessage,
  getOrganizationFollowErrorMessage,
  useBlogPostInteractions,
  useFollowOrganizationMutation,
  useIsFollowingQuery,
  useRelatedPostsQuery,
  useUnfollowOrganizationMutation,
} from "@shared/lib/hooks";
import { useScrollProgress } from "@shared/lib/hooks/useScrollProgress";
import { Container } from "@shared/ui/container";
import {
  CalmBlogCard,
  Eyebrow,
  ItalicAccent,
} from "@shared/ui/design-system";
import {
  BlogContentBlocks,
  CommentsSection,
  LikeButton,
  SaveButton,
} from "@shared/ui";

import type { BlockNoteContentBlock, BlogPost } from "@entities/blog";

export interface BlogArticleProps {
  post: BlogPost;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function tocFromBlocks(blocks: BlockNoteContentBlock[]): TocItem[] {
  const items: TocItem[] = [];
  for (const block of blocks) {
    if (block.type !== "heading") continue;
    const level = Math.min(6, Math.max(1, Number(block.props?.level) ?? 1));
    const text = (block.content ?? [])
      .map((c) => c.text ?? "")
      .filter(Boolean)
      .join(" ");
    if (text) items.push({ id: block.id, text, level });
  }
  return items;
}

function tocFromHtml(html: string): TocItem[] {
  const re = /<h([2-3])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-3]>/gi;
  const items: TocItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    items.push({ id: m[2], text: m[3], level: parseInt(m[1], 10) });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* ReadingProgressBar — fixed top, ember accent                        */
/* ------------------------------------------------------------------ */

function ReadingProgressBar({
  progress,
}: {
  progress: number;
}): React.ReactNode {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        background: "transparent",
        zIndex: 1100,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, var(--ember-300), var(--ember-500))",
          transition: "width 120ms linear",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ScrollAwareMiniHeader — appears after hero scrolls out              */
/* ------------------------------------------------------------------ */

function ScrollAwareMiniHeader({
  post,
  visible,
  onScrollTop,
}: {
  post: BlogPost;
  visible: boolean;
  onScrollTop: () => void;
}): React.ReactNode {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? window.location.href
          : `/blog/${post.slug}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [post.slug]);

  return (
    <div
      aria-hidden={!visible}
      className="cm-blog-mini-header"
      style={{
        position: "fixed",
        top: 64,
        left: 0,
        right: 0,
        zIndex: 990,
        background: "color-mix(in srgb, var(--bg-1) 88%, transparent)",
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        borderBottom: "1px solid var(--border-1)",
        transform: visible ? "translateY(0)" : "translateY(-120%)",
        opacity: visible ? 1 : 0,
        transition:
          "transform 280ms var(--ease-standard), opacity 280ms var(--ease-standard)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="container-wide"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingBlock: 12,
          minHeight: 52,
        }}
      >
        <Link
          href="/blog"
          aria-label={t("public.blog.article.backToBlog")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid var(--border-1)",
            background: "var(--bg-2)",
            color: "var(--fg-2)",
            flexShrink: 0,
            transition:
              "color 200ms, border-color 200ms, background 200ms",
          }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div
          style={{
            font: "600 14px/1.3 var(--font-sans)",
            color: "var(--ink-400)",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
            minWidth: 0,
          }}
        >
          {post.title}
        </div>
        <div
          className="cm-blog-mini-actions"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <LikeButton
            postId={post.id}
            variant="compact"
            showCount={false}
            className="text-fg-2 hover:text-[var(--danger)]"
          />
          <SaveButton postId={post.id} variant="compact" label="" />
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label={t("public.blog.article.copyLink")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid var(--border-1)",
              background: "var(--bg-2)",
              color: "var(--fg-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {copied ? (
              <Check size={15} style={{ color: "var(--forest-500)" }} />
            ) : (
              <Copy size={15} />
            )}
          </button>
          <button
            type="button"
            onClick={onScrollTop}
            aria-label={t("public.blog.article.scrollTop")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid var(--border-1)",
              background: "var(--bg-2)",
              color: "var(--fg-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <ArrowUp size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ShareRow — inline horizontal (used in hero + bottom strip)          */
/* ------------------------------------------------------------------ */

function ShareRow({
  post,
  showLabel = true,
}: {
  post: BlogPost;
  showLabel?: boolean;
}): React.ReactNode {
  const t = useT();
  const [copied, setCopied] = useState(false);
  // Compute share URL only after mount to avoid SSR/CSR hydration mismatch.
  const [shareUrl, setShareUrl] = useState<string>(`/blog/${post.slug}`);
  // eslint-disable-next-line no-restricted-syntax -- attach absolute URL after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, []);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }, [shareUrl]);

  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  const iconBtn: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    background: "var(--bg-2)",
    border: "1px solid var(--border-1)",
    color: "var(--fg-2)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition:
      "border-color 200ms, color 200ms, background 200ms, transform 200ms",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {showLabel ? (
        <span
          style={{
            font: "500 11px/1 var(--font-mono)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--fg-3)",
            marginRight: 6,
          }}
        >
          {t("public.blog.article.share")}
        </span>
      ) : null}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={iconBtn}
        aria-label={t("public.blog.article.shareInLinkedin")}
      >
        <Linkedin size={15} />
      </a>
      <button
        type="button"
        onClick={() => void handleCopy()}
        style={iconBtn}
        aria-label={t("public.blog.article.copyLink")}
      >
        {copied ? (
          <Check size={15} style={{ color: "var(--forest-500)" }} />
        ) : (
          <Copy size={15} />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StickyToc — refined editorial table of contents                     */
/* ------------------------------------------------------------------ */

function StickyToc({
  items,
  activeId,
  onSelect,
}: {
  items: TocItem[];
  activeId: string;
  onSelect: (id: string) => void;
}): React.ReactNode {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <nav
      aria-label={t("public.blog.article.tableOfContentsAria")}
      style={{ font: "500 13px/1.5 var(--font-sans)" }}
    >
      <div
        style={{
          font: "600 10px/1 var(--font-mono)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--fg-3)",
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: "1px solid var(--border-1)",
        }}
      >
        {t("public.blog.article.contents")}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} style={{ marginBottom: 2 }}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    onSelect(item.id);
                  }
                }}
                style={{
                  display: "block",
                  position: "relative",
                  paddingInlineStart: item.level === 3 ? 22 : 14,
                  paddingBlock: 6,
                  borderInlineStart: active
                    ? "2px solid var(--ember-400)"
                    : "2px solid var(--border-1)",
                  marginInlineStart: item.level === 3 ? 8 : 0,
                  font: active
                    ? "600 13px/1.5 var(--font-sans)"
                    : "500 13px/1.5 var(--font-sans)",
                  color: active ? "var(--ink-400)" : "var(--fg-2)",
                  textDecoration: "none",
                  transition: "color 150ms, border-color 150ms",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.color = "var(--ink-400)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.color = "var(--fg-2)";
                }}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* AuthorPanel (sidebar) + AuthorFooterCard (full-width bottom)        */
/* ------------------------------------------------------------------ */

function useAuthorFollow(post: BlogPost): {
  showFollow: boolean;
  isFollowing: boolean;
  isFollowLoading: boolean;
  handleToggle: () => void;
} {
  const t = useT();
  const organizationId = post.organizationId ?? post.author?.id ?? "";
  const isFollowingQuery = useIsFollowingQuery(organizationId);
  const followMutation = useFollowOrganizationMutation();
  const unfollowMutation = useUnfollowOrganizationMutation();
  const isFollowing = isFollowingQuery.data?.isFollowing ?? false;
  const isFollowLoading =
    followMutation.isPending || unfollowMutation.isPending;
  const showFollow = Boolean(organizationId);

  const handleToggle = (): void => {
    if (!organizationId) return;
    if (!isAuthenticated()) {
      toast.error(t("public.organizer.toasts.signInToFollow"));
      return;
    }
    if (isFollowing) {
      unfollowMutation.mutate(organizationId, {
        onError: (err) => toast.error(getOrganizationFollowErrorMessage(err)),
      });
    } else {
      followMutation.mutate(organizationId, {
        onError: (err) => toast.error(getOrganizationFollowErrorMessage(err)),
      });
    }
  };

  return { showFollow, isFollowing, isFollowLoading, handleToggle };
}

function authorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AuthorPanel({ post }: { post: BlogPost }): React.ReactNode {
  const t = useT();
  const { showFollow, isFollowing, isFollowLoading, handleToggle } =
    useAuthorFollow(post);
  const initials = authorInitials(post.author.name);

  const authorBlock = (
    <>
      {post.author.avatar ? (
        // `display: inline-block` is load-bearing here. The avatar uses
        // `<Image fill>`, which is `position: absolute` and sizes itself off
        // its `position: relative` parent's box. A <span> defaults to
        // `display: inline`, where `width`/`height` are IGNORED — so without
        // this the logo collapsed to 0×0 even though the URL loaded fine.
        <span
          style={{
            display: "inline-block",
            position: "relative",
            width: 48,
            height: 48,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--bone-300)",
            flexShrink: 0,
            border: "1px solid var(--border-1)",
          }}
        >
          <Image
            src={post.author.avatar}
            alt={post.author.name}
            fill
            sizes="48px"
            style={{ objectFit: "cover" }}
          />
        </span>
      ) : (
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--ember-400), var(--ember-300))",
            color: "var(--bone-50)",
            font: "700 17px/1 var(--font-sans)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {initials}
        </span>
      )}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            font: "700 15px/1.25 var(--font-sans)",
            letterSpacing: "-0.01em",
            color: "var(--ink-400)",
          }}
        >
          {post.author.name}
        </div>
        {post.author.role ? (
          <div
            style={{
              font: "500 11px/1.4 var(--font-mono)",
              letterSpacing: "0.04em",
              color: "var(--fg-3)",
              marginTop: 4,
              textTransform: "uppercase",
            }}
          >
            {post.author.role}
          </div>
        ) : null}
      </div>
    </>
  );

  const wrapStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  };

  return (
    <div
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: 14,
        padding: 20,
      }}
    >
      <Eyebrow style={{ marginBottom: 14 }}>
        {t("public.blog.article.writtenBy")}
      </Eyebrow>
      {post.organizationId ? (
        <Link
          href={`/organizers/${post.organizationId}`}
          style={{
            ...wrapStyle,
            textDecoration: "none",
            color: "inherit",
            borderRadius: 10,
            margin: "-6px -6px 8px",
            padding: 6,
            transition: "background 200ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {authorBlock}
        </Link>
      ) : (
        <div style={wrapStyle}>{authorBlock}</div>
      )}
      {post.author.bio ? (
        <p
          style={{
            font: "400 13px/1.55 var(--font-sans)",
            color: "var(--fg-2)",
            margin: "0 0 16px",
            textWrap: "pretty",
          }}
        >
          {post.author.bio}
        </p>
      ) : null}
      {showFollow ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isFollowLoading}
          style={{
            width: "100%",
            font: "600 13px/1 var(--font-sans)",
            padding: "11px 16px",
            borderRadius: 999,
            cursor: isFollowLoading ? "wait" : "pointer",
            border: isFollowing
              ? "1px solid var(--border-2)"
              : "1px solid transparent",
            background: isFollowing ? "transparent" : "var(--ink-400)",
            color: isFollowing ? "var(--ink-400)" : "var(--bone-50)",
            opacity: isFollowLoading ? 0.6 : 1,
            transition: "background 200ms, border-color 200ms, color 200ms",
          }}
        >
          {isFollowLoading
            ? "..."
            : isFollowing
              ? t("public.organizer.unfollow")
              : t("public.organizer.follow")}
        </button>
      ) : null}
    </div>
  );
}

function AuthorFooterCard({ post }: { post: BlogPost }): React.ReactNode {
  const t = useT();
  const { showFollow, isFollowing, isFollowLoading, handleToggle } =
    useAuthorFollow(post);
  const initials = authorInitials(post.author.name);

  const avatar = post.author.avatar ? (
    // `display: inline-block` is load-bearing — see AuthorPanel for the why.
    // Without it the <span> defaults to inline, its 64×64 sizing is ignored,
    // and `<Image fill>` (position:absolute, height/width 100%) collapses to
    // 0×0 because its containing block has no resolved size.
    <span
      style={{
        display: "inline-block",
        position: "relative",
        width: 64,
        height: 64,
        borderRadius: "50%",
        overflow: "hidden",
        background: "var(--bone-300)",
        flexShrink: 0,
        border: "1px solid var(--border-1)",
      }}
    >
      <Image
        src={post.author.avatar}
        alt={post.author.name}
        fill
        sizes="64px"
        style={{ objectFit: "cover" }}
      />
    </span>
  ) : (
    <span
      style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background:
          "linear-gradient(135deg, var(--ember-400), var(--ember-300))",
        color: "var(--bone-50)",
        font: "700 22px/1 var(--font-sans)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );

  return (
    <aside
      className="cm-blog-author-footer"
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border-1)",
        borderRadius: 16,
        padding: 28,
        display: "flex",
        gap: 22,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {post.organizationId ? (
        <Link
          href={`/organizers/${post.organizationId}`}
          style={{ flexShrink: 0, textDecoration: "none", color: "inherit" }}
        >
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <Eyebrow style={{ marginBottom: 6 }}>
          {t("public.blog.article.writtenBy")}
        </Eyebrow>
        <div
          style={{
            font: "700 18px/1.25 var(--font-sans)",
            letterSpacing: "-0.015em",
            color: "var(--ink-400)",
          }}
        >
          {post.organizationId ? (
            <Link
              href={`/organizers/${post.organizationId}`}
              style={{ color: "inherit", textDecoration: "none" }}
            >
              {post.author.name}
            </Link>
          ) : (
            post.author.name
          )}
        </div>
        {post.author.role ? (
          <div
            style={{
              font: "500 11px/1.4 var(--font-mono)",
              letterSpacing: "0.04em",
              color: "var(--fg-3)",
              marginTop: 4,
              textTransform: "uppercase",
            }}
          >
            {post.author.role}
          </div>
        ) : null}
        {post.author.bio ? (
          <p
            style={{
              font: "400 14px/1.6 var(--font-sans)",
              color: "var(--fg-2)",
              margin: "10px 0 0",
              textWrap: "pretty",
              maxWidth: "60ch",
            }}
          >
            {post.author.bio}
          </p>
        ) : null}
      </div>
      {showFollow ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isFollowLoading}
          style={{
            font: "600 13px/1 var(--font-sans)",
            padding: "12px 22px",
            borderRadius: 999,
            cursor: isFollowLoading ? "wait" : "pointer",
            border: isFollowing
              ? "1px solid var(--border-2)"
              : "1px solid transparent",
            background: isFollowing ? "transparent" : "var(--ink-400)",
            color: isFollowing ? "var(--ink-400)" : "var(--bone-50)",
            opacity: isFollowLoading ? 0.6 : 1,
            transition: "background 200ms, border-color 200ms, color 200ms",
          }}
        >
          {isFollowLoading
            ? "..."
            : isFollowing
              ? t("public.organizer.unfollow")
              : t("public.organizer.follow")}
        </button>
      ) : null}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Related (lazy in-view)                                              */
/* ------------------------------------------------------------------ */

function RelatedCardLazy({
  post,
  trendingLabel,
}: {
  post: BlogPost;
  trendingLabel: string;
}): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  useInView(ref, { once: true, margin: "100px" });
  return (
    <div ref={ref}>
      <CalmBlogCard
        post={{
          title: post.title,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          categoryLabel: getCategoryLabel(post.category),
          date: formatPublishDate(post.publishedAt),
          readTime: formatReadTime(post.readTime),
          authorName: post.author.name,
          authorAvatar: post.author.avatar,
          trending: post.trending,
        }}
        href={`/blog/${post.slug}`}
        variant="compact"
        trendingLabel={trendingLabel}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BlogArticle                                                          */
/* ------------------------------------------------------------------ */

export function BlogArticle({ post }: BlogArticleProps): React.ReactNode {
  const t = useT();
  const onLikeError = useCallback(
    (err: unknown) => toast.error(getBlogInteractionErrorMessage(err)),
    [],
  );
  const onSaveError = useCallback(
    (err: unknown) => toast.error(getBlogInteractionErrorMessage(err)),
    [],
  );

  const { data: relatedPosts } = useRelatedPostsQuery(post.id, 3);
  const { progress, scrollY, scrollToTop } = useScrollProgress();
  const [activeHeadingId, setActiveHeadingId] = useState("");
  useBlogPostInteractions(post.id);

  const tocItems = useMemo(
    () =>
      post.contentBlocks?.length
        ? tocFromBlocks(post.contentBlocks)
        : tocFromHtml(post.content),
    [post.contentBlocks, post.content],
  );

  // eslint-disable-next-line no-restricted-syntax -- scroll listener for TOC active state
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const compute = (): void => {
      frame = 0;
      const triggerY = 140;
      let nextId = "";
      for (const item of tocItems) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - triggerY <= 0) nextId = item.id;
        else break;
      }
      if (nextId) {
        setActiveHeadingId((prev) => (prev === nextId ? prev : nextId));
      }
    };
    const onScroll = (): void => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [tocItems]);

  const trendingLabel = t("public.blog.hero.trending");
  const miniHeaderVisible = scrollY > 480;
  const categoryLabel = getCategoryLabel(post.category);
  const dateLabel = formatPublishDate(post.publishedAt);
  const readLabel = formatReadTime(post.readTime);

  return (
    <>
      <ReadingProgressBar progress={progress} />
      <ScrollAwareMiniHeader
        post={post}
        visible={miniHeaderVisible}
        onScrollTop={scrollToTop}
      />

      <article
        style={{
          background: "var(--bg-1)",
          color: "var(--fg-1)",
        }}
      >
        {/* HERO */}
        <header style={{ position: "relative", paddingBlock: "48px 28px" }}>
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 60,
              left: "50%",
              width: 880,
              height: 480,
              transform: "translateX(-50%)",
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, var(--ember-100) 0%, transparent 65%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <Container size="narrow" style={{ position: "relative", zIndex: 1 }}>
            <Link
              href="/blog"
              className="cm-blog-back-chip"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                font: "500 12px/1 var(--font-mono)",
                letterSpacing: "0.04em",
                color: "var(--fg-2)",
                marginBottom: 28,
                textDecoration: "none",
                background: "var(--bg-2)",
                border: "1px solid var(--border-1)",
                borderRadius: 999,
                padding: "8px 14px 8px 12px",
                transition:
                  "color 200ms, border-color 200ms, background 200ms, transform 200ms",
              }}
            >
              <ArrowLeft size={14} />
              {t("public.blog.article.backToBlog")}
            </Link>

            {/* Editorial eyebrow row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 18,
              }}
            >
              {categoryLabel ? (
                <span
                  style={{
                    font: "600 11px/1 var(--font-mono)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--ember-500)",
                    background: "var(--ember-50)",
                    border: "1px solid var(--ember-100)",
                    borderRadius: 999,
                    padding: "6px 10px",
                  }}
                >
                  {categoryLabel}
                </span>
              ) : null}
              {post.trending ? (
                <span
                  style={{
                    font: "600 11px/1 var(--font-mono)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--bone-50)",
                    background: "var(--ink-400)",
                    borderRadius: 999,
                    padding: "6px 10px",
                  }}
                >
                  {trendingLabel}
                </span>
              ) : null}
              <span
                style={{
                  font: "500 11px/1 var(--font-mono)",
                  letterSpacing: "0.04em",
                  color: "var(--fg-3)",
                  textTransform: "uppercase",
                }}
              >
                {dateLabel} · {readLabel}
              </span>
            </div>

            <h1
              className="cm-blog-detail-h1"
              style={{
                font: "800 60px/1.05 var(--font-sans)",
                letterSpacing: "-0.035em",
                margin: 0,
                color: "var(--ink-400)",
                textWrap: "balance",
              }}
            >
              {post.title}
            </h1>
            {post.excerpt ? (
              <p
                className="cm-blog-detail-lead"
                style={{
                  font: "400 19px/1.6 var(--font-sans)",
                  color: "var(--fg-2)",
                  margin: "22px 0 0",
                  maxWidth: "62ch",
                  textWrap: "pretty",
                }}
              >
                {post.excerpt}
              </p>
            ) : null}

            <div
              style={{
                marginTop: 34,
                paddingTop: 22,
                borderTop: "1px solid var(--border-1)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {(() => {
                const bylineInner = (
                  <>
                    {post.author.avatar ? (
                      <span
                        style={{
                          position: "relative",
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          overflow: "hidden",
                          background: "var(--bone-300)",
                          flexShrink: 0,
                          border: "1px solid var(--border-1)",
                        }}
                      >
                        <Image
                          src={post.author.avatar}
                          alt={post.author.name}
                          fill
                          sizes="40px"
                          style={{ objectFit: "cover" }}
                        />
                      </span>
                    ) : (
                      <span
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background:
                            "linear-gradient(135deg, var(--ember-400), var(--ember-300))",
                          color: "var(--bone-50)",
                          font: "700 14px/1 var(--font-sans)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {authorInitials(post.author.name)}
                      </span>
                    )}
                    <div>
                      <div
                        style={{
                          font: "600 14px/1.2 var(--font-sans)",
                          color: "var(--ink-400)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {post.author.name}
                      </div>
                      {post.author.role ? (
                        <div
                          style={{
                            font: "500 11px/1.4 var(--font-mono)",
                            color: "var(--fg-3)",
                            letterSpacing: "0.04em",
                            marginTop: 3,
                            textTransform: "uppercase",
                          }}
                        >
                          {post.author.role}
                        </div>
                      ) : null}
                    </div>
                  </>
                );
                const bylineStyle: React.CSSProperties = {
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                };
                return post.organizationId ? (
                  <Link
                    href={`/organizers/${post.organizationId}`}
                    style={{
                      ...bylineStyle,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {bylineInner}
                  </Link>
                ) : (
                  <div style={bylineStyle}>{bylineInner}</div>
                );
              })()}
              <div style={{ marginLeft: "auto" }}>
                <ShareRow post={post} />
              </div>
            </div>
          </Container>
        </header>

        {/* COVER */}
        <Container size="wide" style={{ paddingBlock: "0 40px" }}>
          <figure
            className="cm-blog-cover"
            style={{
              position: "relative",
              aspectRatio: "21/9",
              borderRadius: 18,
              overflow: "hidden",
              background: "var(--bone-300)",
              boxShadow:
                "0 24px 48px -16px rgba(14, 14, 13, 0.18), 0 4px 12px -4px rgba(14, 14, 13, 0.06)",
              margin: 0,
            }}
          >
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 1320px) 100vw, 1320px"
              priority
              style={{ objectFit: "cover" }}
            />
          </figure>
        </Container>

        {/* BODY + SIDEBAR */}
        <Container size="wide" style={{ paddingBlock: "8px 64px" }}>
          <div className="cm-blog-detail-grid">
            <div style={{ minWidth: 0 }}>
              <div
                className="cm-blog-prose"
                style={{
                  maxWidth: 720,
                  font: "400 17.5px/1.75 var(--font-sans)",
                  color: "var(--fg-1)",
                }}
              >
                {post.contentBlocks?.length ? (
                  <BlogContentBlocks blocks={post.contentBlocks} />
                ) : (
                  <div
                    className="prose prose-lg prose-neutral max-w-none prose-headings:scroll-mt-32 prose-headings:font-bold prose-headings:text-ink-400 prose-p:text-ink-200 prose-p:leading-relaxed prose-a:text-ember-500 prose-a:no-underline hover:prose-a:underline prose-strong:text-ink-400 prose-img:rounded-xl"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                )}
              </div>

              {post.tags.length > 0 ? (
                <div
                  style={{
                    maxWidth: 720,
                    marginTop: 48,
                    paddingTop: 28,
                    borderTop: "1px solid var(--border-1)",
                  }}
                >
                  <Eyebrow style={{ marginBottom: 12 }}>
                    {t("public.blog.article.tags")}
                  </Eyebrow>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {post.tags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/blog?tag=${tag}`}
                        className="cm-blog-tag"
                        style={{
                          font: "500 12px/1 var(--font-mono)",
                          letterSpacing: "0.04em",
                          color: "var(--fg-2)",
                          background: "var(--bg-2)",
                          border: "1px solid var(--border-1)",
                          borderRadius: 999,
                          padding: "8px 12px",
                          textDecoration: "none",
                          textTransform: "uppercase",
                          transition:
                            "color 200ms, border-color 200ms, background 200ms",
                        }}
                      >
                        #{getTagLabel(tag)}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div
                className="cm-blog-engagement"
                style={{
                  maxWidth: 720,
                  marginTop: 28,
                  padding: "16px 18px",
                  background: "var(--bg-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: 14,
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                }}
              >
                <ShareRow post={post} />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <LikeButton
                    postId={post.id}
                    variant="button"
                    onError={onLikeError}
                  />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      font: "600 13px/1 var(--font-sans)",
                      color: "var(--fg-2)",
                      background: "var(--bone-50)",
                      border: "1px solid var(--border-1)",
                      borderRadius: 999,
                      padding: "9px 14px",
                    }}
                    aria-label={t("public.comments.title")}
                  >
                    <MessageCircle size={15} />
                    {post.commentsCount ?? 0}
                  </span>
                  <SaveButton
                    postId={post.id}
                    variant="button"
                    onError={onSaveError}
                  />
                </div>
              </div>

              <div style={{ maxWidth: 720, marginTop: 40 }}>
                <AuthorFooterCard post={post} />
              </div>

              {post.commentsEnabled ? (
                <div style={{ maxWidth: 720, marginTop: 56 }}>
                  <CommentsSection resource="blog" entityId={post.id} />
                </div>
              ) : null}
            </div>

            <aside className="cm-blog-detail-sidebar">
              <div
                style={{
                  position: "sticky",
                  top: 88,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                }}
              >
                <AuthorPanel post={post} />
                {tocItems.length > 0 ? (
                  <div
                    style={{
                      background: "var(--bg-2)",
                      border: "1px solid var(--border-1)",
                      borderRadius: 14,
                      padding: 20,
                    }}
                  >
                    <StickyToc
                      items={tocItems}
                      activeId={activeHeadingId}
                      onSelect={setActiveHeadingId}
                    />
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </Container>

        {/* RELATED */}
        {relatedPosts && relatedPosts.length > 0 ? (
          <section
            style={{
              background: "var(--bg-3)",
              borderTop: "1px solid var(--border-1)",
              paddingBlock: 72,
              marginTop: 24,
            }}
          >
            <Container size="wide">
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 32,
                  paddingBottom: 18,
                  borderBottom: "1px solid var(--border-1)",
                }}
              >
                <div>
                  <Eyebrow style={{ marginBottom: 10 }}>
                    {t("public.blog.article.relatedEyebrow")}
                  </Eyebrow>
                  <h2
                    style={{
                      font: "700 32px/1.05 var(--font-sans)",
                      letterSpacing: "-0.025em",
                      margin: 0,
                      color: "var(--ink-400)",
                      textWrap: "balance",
                    }}
                  >
                    {t("public.blog.article.relatedTitleLead")}
                    <ItalicAccent>
                      {t("public.blog.article.relatedTitleAccent")}
                    </ItalicAccent>
                  </h2>
                </div>
                <Link
                  href="/blog"
                  style={{
                    font: "600 13px/1 var(--font-sans)",
                    color: "var(--ink-400)",
                    textDecoration: "underline",
                    textDecorationColor: "var(--ember-400)",
                    textDecorationThickness: 2,
                    textUnderlineOffset: 6,
                  }}
                >
                  {t("public.blog.catalog.title")} →
                </Link>
              </div>
              <div className="cm-blog-related-grid">
                {relatedPosts.map((rp) => (
                  <RelatedCardLazy
                    key={rp.id}
                    post={rp}
                    trendingLabel={trendingLabel}
                  />
                ))}
              </div>
            </Container>
          </section>
        ) : null}

        {/* CTA */}
        <section style={{ paddingBlock: "80px 96px" }}>
          <Container size="wide">
            <div
              className="cm-blog-cta"
              style={{
                background: "var(--ink-400)",
                color: "var(--bone-50)",
                borderRadius: 22,
                padding: "60px 60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 48,
                position: "relative",
                overflow: "hidden",
                flexWrap: "wrap",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  right: -60,
                  top: -60,
                  width: 360,
                  height: 360,
                  background:
                    "radial-gradient(circle, rgba(234,88,12,0.36) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: -80,
                  bottom: -100,
                  width: 280,
                  height: 280,
                  background:
                    "radial-gradient(circle, rgba(251,137,63,0.18) 0%, transparent 60%)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", maxWidth: 620 }}>
                <Eyebrow color="rgba(251,251,250,0.7)">
                  {t("public.blog.article.ctaEyebrow")}
                </Eyebrow>
                <div
                  className="cm-blog-cta-title"
                  style={{
                    font: "700 38px/1.1 var(--font-sans)",
                    letterSpacing: "-0.03em",
                    marginTop: 16,
                    textWrap: "balance",
                  }}
                >
                  {t("public.blog.article.ctaTitle")}
                </div>
                <p
                  style={{
                    font: "400 15px/1.6 var(--font-sans)",
                    color: "rgba(251,251,250,0.7)",
                    marginTop: 14,
                    maxWidth: 540,
                    textWrap: "pretty",
                  }}
                >
                  {t("public.blog.article.ctaDescription")}
                </p>
              </div>
              <div
                className="cm-blog-cta-actions"
                style={{
                  display: "flex",
                  gap: 12,
                  flexDirection: "column",
                  position: "relative",
                }}
              >
                <Link
                  href="/events"
                  style={{
                    background: "var(--ember-400)",
                    color: "var(--bone-50)",
                    font: "600 14px/1 var(--font-sans)",
                    padding: "15px 26px",
                    borderRadius: 999,
                    textDecoration: "none",
                    textAlign: "center",
                    transition: "background 200ms, transform 200ms",
                  }}
                >
                  {t("public.navigation.createEvent")}
                </Link>
                <Link
                  href="/events"
                  style={{
                    background: "transparent",
                    color: "var(--bone-50)",
                    font: "600 14px/1 var(--font-sans)",
                    padding: "15px 26px",
                    borderRadius: 999,
                    border: "1px solid rgba(251,251,250,0.3)",
                    textDecoration: "none",
                    textAlign: "center",
                    transition: "background 200ms, border-color 200ms",
                  }}
                >
                  {t("public.blog.article.viewEvents")}
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </article>

      <style>{`
        .cm-blog-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 64px;
          align-items: start;
        }
        .cm-blog-related-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .cm-blog-back-chip:hover {
          color: var(--ink-400);
          border-color: var(--border-2);
          background: var(--bg-3);
        }
        .cm-blog-tag:hover {
          color: var(--ink-400);
          border-color: var(--border-2);
          background: var(--bone-50);
        }
        .cm-blog-cta-actions a:hover {
          background: var(--ember-500);
        }
        .cm-blog-cta-actions a:nth-child(2):hover {
          background: rgba(251,251,250,0.06);
          border-color: rgba(251,251,250,0.5);
        }
        .cm-blog-prose p:first-of-type {
          font-size: 19px;
          line-height: 1.7;
          color: var(--fg-1);
        }
        .cm-blog-prose h2 {
          margin-top: 56px !important;
          font: 700 28px/1.2 var(--font-sans);
          letter-spacing: -0.02em;
          color: var(--ink-400);
        }
        .cm-blog-prose h3 {
          margin-top: 40px !important;
          font: 600 22px/1.3 var(--font-sans);
          letter-spacing: -0.015em;
          color: var(--ink-400);
        }
        .cm-blog-prose p { margin-top: 1.1em; }
        .cm-blog-prose blockquote {
          border-inline-start: 3px solid var(--ember-400);
          padding: 4px 0 4px 20px;
          margin: 28px 0;
          font: 500 19px/1.55 var(--font-display, var(--font-sans));
          font-style: italic;
          color: var(--ink-300);
        }
        .cm-blog-prose figure { margin: 32px 0; }
        @media (max-width: 980px) {
          .cm-blog-mini-header { display: none !important; }
          .cm-blog-detail-h1 { font-size: 42px !important; }
          .cm-blog-detail-lead { font-size: 17px !important; }
          .cm-blog-detail-grid { grid-template-columns: 1fr; gap: 40px; }
          .cm-blog-related-grid { grid-template-columns: 1fr; }
          .cm-blog-cta { padding: 40px 28px !important; }
          .cm-blog-cta-title { font-size: 30px !important; }
          .cm-blog-author-footer { padding: 22px !important; }
          .cm-blog-cover { aspect-ratio: 16/9 !important; border-radius: 14px !important; }
        }
        @media (min-width: 981px) and (max-width: 1280px) {
          .cm-blog-related-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 620px) {
          .cm-blog-detail-h1 { font-size: 32px !important; letter-spacing: -0.025em; }
          .cm-blog-cover { aspect-ratio: 4/3 !important; border-radius: 12px !important; }
          .cm-blog-engagement { padding: 14px !important; }
          .cm-blog-cta-actions { width: 100%; }
          .cm-blog-cta-actions a { width: 100%; }
        }
      `}</style>
    </>
  );
}
