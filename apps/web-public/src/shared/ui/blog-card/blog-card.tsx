/**
 * @module shared/ui/blog-card
 * @description Современная карточка блог-поста с поддержкой лайков и сохранений
 * Вдохновлено: Portrait, Craft, Ada
 */

"use client";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";

import { Clock, ArrowUpRight } from "lucide-react";

/* eslint-disable import/no-restricted-paths */
import type { BlogPost } from "@/entities/blog";
import {
  formatDate,
  getReadingTime,
  getCategoryLabel,
  getTagLabel,
} from "@/entities/blog";
/* eslint-enable import/no-restricted-paths */

import { cn } from "../../lib/utils";
import { LikeButton, SaveButton } from "../blog-interactions";

export interface BlogCardProps {
  post: BlogPost;
  variant?: "default" | "featured" | "compact" | "horizontal";
  className?: string;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  /** Показывать кнопки взаимодействия (лайк, сохранение) */
  showInteractions?: boolean;
  /** Lazy: запрашивать like/saved только при true (карточка во viewport) */
  interactionsEnabled?: boolean;
}

export function BlogCard({
  post,
  variant = "default",
  className = "",
  showExcerpt = true,
  showAuthor = true,
  showInteractions = true,
  interactionsEnabled = true,
}: BlogCardProps) {
  // Horizontal variant (for sidebar/related posts)
  if (variant === "horizontal") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className={cn(
          "group flex gap-4 rounded-xl p-2 transition-all duration-200 hover:bg-bone-100",
          className
        )}
      >
        <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg bg-bone-200">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <span className="mb-1 text-xs font-medium text-ember-500">
            {getCategoryLabel(post.category)}
          </span>
          <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-400 transition-colors group-hover:text-ember-500">
            {post.title}
          </h4>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xs text-ink-100">
              {formatDate(post.publishedAt)}
            </span>
            {showInteractions && (
              <div className="flex items-center gap-1">
                <LikeButton
                  postId={post.id}
                  variant="compact"
                  showCount={false}
                  enabled={interactionsEnabled}
                />
                <SaveButton
                  postId={post.id}
                  variant="compact"
                  enabled={interactionsEnabled}
                />
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Compact variant (minimal)
  if (variant === "compact") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className={cn(
          "group block overflow-hidden rounded-xl border border-bone-300/60 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-ink-400/5",
          className
        )}
      >
        <div className="relative aspect-16/10 overflow-hidden bg-bone-200">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

          {/* Category badge */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="inline-block rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-400 backdrop-blur-sm">
              {getCategoryLabel(post.category)}
            </span>

            {/* Interaction buttons */}
            {showInteractions && (
              <div className="flex items-center gap-1">
                <LikeButton
                  postId={post.id}
                  variant="icon"
                  showCount={false}
                  className="size-8"
                  enabled={interactionsEnabled}
                />
                <SaveButton
                  postId={post.id}
                  variant="icon"
                  className="size-8"
                  enabled={interactionsEnabled}
                />
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-ink-400 transition-colors group-hover:text-ember-500">
            {post.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-ink-100">
            <Clock className="size-3" />
            <span>{getReadingTime(post.content)} мин чтения</span>
          </div>
        </div>
      </Link>
    );
  }

  // Featured variant (large)
  if (variant === "featured") {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className={cn(
          "group relative block overflow-hidden rounded-xl border border-bone-300/60 bg-white shadow-lg shadow-ink-400/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink-400/10",
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-video overflow-hidden bg-bone-200">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent" />

          {/* Category & badges */}
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-400 shadow-lg backdrop-blur-sm">
              {getCategoryLabel(post.category)}
            </span>
            {post.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-400 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                <span className="size-1.5 animate-pulse rounded-full bg-white" />
                Featured
              </span>
            )}
          </div>

          {/* Interaction buttons */}
          {showInteractions && (
            <div className="absolute right-4 top-4 flex items-center gap-2">
              <LikeButton
                postId={post.id}
                variant="icon"
                showCount={false}
                enabled={interactionsEnabled}
              />
              <SaveButton
                postId={post.id}
                variant="icon"
                enabled={interactionsEnabled}
              />
            </div>
          )}

          {/* Bottom content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h3 className="mb-3 text-xl font-bold leading-tight text-white drop-shadow-lg md:text-2xl lg:text-3xl">
              {post.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-white/90">
              {showAuthor && post.author && (
                <div className="flex items-center gap-2">
                  {post.author.avatar ? (
                    <div className="relative size-8 overflow-hidden rounded-full ring-2 ring-white/30">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                      {post.author.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{post.author.name}</span>
                </div>
              )}
              <span className="text-white/60">•</span>
              <span>{formatDate(post.publishedAt)}</span>
              <span className="text-white/60">•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" />
                {getReadingTime(post.content)} мин
              </span>
            </div>
          </div>
        </div>

        {/* Excerpt below image */}
        {showExcerpt && (
          <div className="p-5 md:p-6">
            <p className="line-clamp-2 text-base leading-relaxed text-ink-100">
              {post.excerpt}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ember-500">
              <span>Читать статью</span>
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        )}
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group relative flex h-full min-h-[460px] flex-col overflow-hidden rounded-[22px] border border-bone-300/70 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-all duration-300",
        "hover:-translate-y-1 hover:border-ember-100 hover:shadow-[0_24px_64px_rgba(15,23,42,0.12)]",
        "active:scale-[0.99] active:duration-100",
        className
      )}
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-bone-200">
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/35 via-black/5 to-transparent" />

        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-400 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
            {getCategoryLabel(post.category)}
          </span>
        </div>

        {post.featured && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-ember-400 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
              <span className="size-1 animate-pulse rounded-full bg-white" />
              Featured
            </span>
          </div>
        )}

        {showInteractions && (
          <div className="absolute right-3 bottom-3 flex items-center gap-1.5 sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
            <LikeButton
              postId={post.id}
              variant="icon"
              showCount={false}
              className="size-8"
              enabled={interactionsEnabled}
            />
            <SaveButton
              postId={post.id}
              variant="icon"
              className="size-8"
              enabled={interactionsEnabled}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-ember-500/0 opacity-0 transition-all duration-300 group-hover:bg-ember-500/10 group-hover:opacity-100 sm:flex">
          <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink-400 shadow-xl">
            Читать <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-lg font-bold leading-snug text-ink-400 transition-colors group-hover:text-ember-500 sm:text-xl">
          {post.title}
        </h3>

        {showExcerpt && (
          <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-ink-100">
            {post.excerpt}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-bone-100 px-2.5 py-1 text-[11px] font-medium text-ink-200 ring-1 ring-bone-300/60"
              >
                #{getTagLabel(tag)}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="rounded-full px-2 py-1 text-[11px] font-medium text-ink-100">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex min-w-0 items-center gap-3 border-t border-bone-200 pt-4">
          {showAuthor && post.author && (
            <div className="flex min-w-0 items-center gap-2">
              {post.author.avatar ? (
                <div className="relative size-6 overflow-hidden rounded-full bg-bone-300 ring-1 ring-bone-200 sm:size-7">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex size-6 items-center justify-center rounded-full bg-linear-to-br from-ember-300 to-ember-500 text-xs font-bold text-white sm:size-7">
                  {post.author.name.charAt(0)}
                </div>
              )}
              <span className="truncate text-sm font-medium text-ink-200">
                {post.author.name}
              </span>
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-ink-100">
            <span>{formatDate(post.publishedAt)}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {getReadingTime(post.content)} мин
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
