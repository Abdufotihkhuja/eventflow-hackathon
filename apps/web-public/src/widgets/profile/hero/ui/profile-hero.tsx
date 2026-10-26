"use client";

import { useRef } from "react";

import Image from "next/image";

import { useT } from "@eventflow/i18n/react";
import {
  Award,
  BadgeCheck,
  BookmarkCheck,
  Camera,
  Facebook,
  Globe,
  Instagram,
  Linkedin,
  Loader2,
  Pencil,
  Share2,
  Ticket,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCurrentUserQuery,
  useDeleteAvatarMutation,
  useUploadAvatarMutation,
} from "@shared/lib/hooks";
import { cn, getUserDisplayName, resolveAvatarUrl } from "@shared/lib/utils";
import { Button } from "@shared/ui/button";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";

import type { LucideIcon } from "lucide-react";

interface ProfileIdentityCardProps {
  eventsCount?: number;
  certificatesCount?: number;
  savedCount?: number;
}

interface UserLike {
  name?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
  avatarUrl?: string | null;
  isEmailVerified?: boolean | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
}

function getDisplayName(user: UserLike | null | undefined): string {
  return getUserDisplayName(user);
}

function getUsername(user: { email?: string } | null): string {
  if (user?.email) return `@${user.email.split("@")[0]}`;
  return "@user";
}

function getAvatar(user: UserLike | null): string | null {
  return resolveAvatarUrl(user?.avatarUrl) ?? null;
}

function ensureExternalHref(href: string): string {
  return href.startsWith("http") ? href : `https://${href}`;
}

interface ProfileAvatarProps {
  avatar: string | null;
  name: string;
  size?: "md" | "lg";
  onUploadClick?: () => void;
  onDelete?: () => void;
  isBusy?: boolean;
  uploadLabel?: string;
  deleteLabel?: string;
}

function ProfileAvatar({
  avatar,
  name,
  size = "lg",
  onUploadClick,
  onDelete,
  isBusy = false,
  uploadLabel,
  deleteLabel,
}: ProfileAvatarProps): React.ReactNode {
  const dimension = size === "lg" ? 112 : 64;
  const sizeClasses =
    size === "lg" ? "h-28 w-28 rounded-xl" : "h-16 w-16 rounded-lg";

  return (
    <div className="group relative inline-block">
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={dimension}
          height={dimension}
          className={cn(
            sizeClasses,
            "border border-bone-300/60 bg-bone-200 object-cover"
          )}
        />
      ) : (
        <div
          className={cn(
            sizeClasses,
            "flex items-center justify-center border border-bone-300/60 bg-bone-200 text-ink-100"
          )}
        >
          <User className={size === "lg" ? "h-10 w-10" : "h-7 w-7"} aria-hidden />
        </div>
      )}

      {onUploadClick && (
        <div
          className={cn(
            sizeClasses,
            "absolute inset-0 flex items-center justify-center gap-2 bg-ink-400/55 opacity-0 backdrop-blur-[2px] transition-opacity duration-200",
            "group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        >
          {isBusy ? (
            <Loader2 className="h-7 w-7 animate-spin text-bone-50" aria-hidden />
          ) : (
            <>
              <button
                type="button"
                onClick={onUploadClick}
                disabled={isBusy}
                className="flex h-9 w-9 items-center justify-center rounded-md bg-bone-50 text-ink-300 transition-colors hover:bg-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-400/55"
                aria-label={uploadLabel}
              >
                <Camera className="h-4 w-4" aria-hidden />
              </button>
              {avatar && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isBusy}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-bone-50 text-[var(--danger)] transition-colors hover:bg-bone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-400/55"
                  aria-label={deleteLabel}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SocialLink {
  href: string;
  Icon: LucideIcon;
  label: string;
}

function ProfileSocialLinks({
  links,
}: {
  links: SocialLink[];
}): React.ReactNode {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.map(({ href, Icon, label }) => (
        <a
          key={href}
          href={ensureExternalHref(href)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-bone-300 bg-bone-50 text-ink-100 transition-colors hover:border-ember-200 hover:bg-ember-50 hover:text-ember-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50"
          aria-label={label}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
    </div>
  );
}

function buildSocialLinks(user: UserLike | null, t: ReturnType<typeof useT>): SocialLink[] {
  const links: SocialLink[] = [];
  if (user?.linkedinUrl)
    links.push({ href: user.linkedinUrl, Icon: Linkedin, label: "LinkedIn" });
  if (user?.instagramUrl)
    links.push({ href: user.instagramUrl, Icon: Instagram, label: "Instagram" });
  if (user?.facebookUrl)
    links.push({ href: user.facebookUrl, Icon: Facebook, label: "Facebook" });
  if (user?.websiteUrl)
    links.push({
      href: user.websiteUrl,
      Icon: Globe,
      label: t("public.profile.settings.fields.website"),
    });
  return links;
}

/**
 * Calm editorial identity card — replaces the previous gradient hero banner.
 * Lives at the top of `/profile` (dashboard) only. Bone canvas, ember accent
 * reserved for primary CTA and small role pill.
 */
export function ProfileHero({
  eventsCount = 0,
  certificatesCount = 0,
  savedCount = 0,
}: ProfileIdentityCardProps): React.ReactNode {
  const t = useT();
  const { data: user } = useCurrentUserQuery();

  const displayName = getDisplayName(user ?? null);
  const username = getUsername(user ?? null);
  const avatar = getAvatar(user ?? null);
  const isVerified = user?.isEmailVerified ?? false;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatarMutation();
  const deleteAvatar = useDeleteAvatarMutation();
  const isAvatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;

  const handleAvatarFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("public.profile.hero.toasts.chooseImage"));
      return;
    }
    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(t("public.profile.hero.toasts.maxFileSize", { size: maxMb }));
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () =>
        toast.success(t("public.profile.hero.toasts.avatarUpdated")),
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : t("public.profile.settings.toasts.uploadError")
        ),
    });
    e.target.value = "";
  };

  const handleDeleteAvatar = (): void => {
    deleteAvatar.mutate(undefined, {
      onSuccess: () =>
        toast.success(t("public.profile.hero.toasts.avatarDeleted")),
      onError: (err) =>
        toast.error(
          err instanceof Error
            ? err.message
            : t("public.profile.settings.toasts.deleteError")
        ),
    });
  };

  const handleShare = async (): Promise<void> => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      await navigator.share({
        title: t("public.profile.hero.shareTitle", { name: displayName }),
        url: shareUrl,
      });
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const stats = [
    {
      id: "events",
      labelKey: "public.profile.hero.stats.events",
      value: eventsCount,
      icon: Ticket,
      href: "/profile/events",
      tone: "ember" as const,
    },
    {
      id: "certificates",
      labelKey: "public.profile.hero.stats.certificates",
      value: certificatesCount,
      icon: Award,
      href: "/profile/certificates",
      tone: "ember" as const,
    },
    {
      id: "saved",
      labelKey: "public.profile.hero.stats.saved",
      value: savedCount,
      icon: BookmarkCheck,
      href: "/profile/articles",
      tone: "forest" as const,
    },
  ];

  const socialLinks = buildSocialLinks(user ?? null, t);

  return (
    <Surface
      variant="solid"
      radius="2xl"
      padding="lg"
      className="border border-bone-300/60"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={t("public.profile.hero.chooseAvatarImage")}
        onChange={handleAvatarFileChange}
      />

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="shrink-0">
          <ProfileAvatar
            avatar={avatar}
            name={displayName}
            size="lg"
            onUploadClick={() => fileInputRef.current?.click()}
            onDelete={avatar ? handleDeleteAvatar : undefined}
            isBusy={isAvatarBusy}
            uploadLabel={t("public.profile.hero.uploadOrChangeAvatar")}
            deleteLabel={t("public.profile.hero.deleteAvatar")}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1.5">
            <h1 className="flex flex-wrap items-center gap-2 text-[26px] font-bold leading-tight tracking-tight text-ink-400 sm:text-[30px]">
              <span className="truncate">{displayName}</span>
              {isVerified && (
                <BadgeCheck
                  className="h-5 w-5 shrink-0 text-ember-500 sm:h-6 sm:w-6"
                  aria-label={t("public.profile.verified")}
                />
              )}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-100">
              <span className="truncate">{username}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-bone-400" />
              <span className="inline-flex items-center gap-1 rounded-full bg-ember-50 px-2 py-0.5 text-[11px] font-semibold text-ember-500">
                {t("public.profile.participant")}
              </span>
            </p>
          </div>

          {socialLinks.length > 0 && <ProfileSocialLinks links={socialLinks} />}

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/profile/settings">
              <Button
                variant="primary"
                size="md"
                leftIcon={<Pencil className="h-4 w-4" aria-hidden />}
              >
                {t("actions.edit")}
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Share2 className="h-4 w-4" aria-hidden />}
              onClick={() => void handleShare()}
            >
              {t("actions.share")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            className="group flex items-center gap-3 rounded-xl border border-bone-300/60 bg-bone-100/60 p-4 transition-colors hover:border-bone-400 hover:bg-bone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                stat.tone === "forest"
                  ? "bg-forest-50 text-forest-600"
                  : "bg-ember-50 text-ember-500"
              )}
              aria-hidden
            >
              <stat.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-none text-ink-400 tabular-nums">
                {stat.value}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-100">
                {t(stat.labelKey)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </Surface>
  );
}

/**
 * Compact identity row used in the desktop sidebar — single source of truth
 * for sidebar identity (replaces the previous one-off implementation in the
 * profile layout).
 */
export function ProfileSidebarUserCard({
  user,
}: {
  user: UserLike | null | undefined;
}): React.ReactNode {
  const t = useT();
  const displayName = getDisplayName(user ?? null);
  const avatar = getAvatar(user ?? null);
  const isVerified = user?.isEmailVerified ?? false;

  return (
    <Surface
      variant="solid"
      radius="xl"
      padding="md"
      className="border border-bone-300/60"
    >
      <div className="flex items-center gap-3">
        <ProfileAvatar avatar={avatar} name={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-400">
            <span className="truncate">{displayName}</span>
            {isVerified && (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-ember-500"
                aria-label={t("public.profile.verified")}
              />
            )}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-ember-500">
            {t("public.profile.participant")}
          </p>
        </div>
      </div>
    </Surface>
  );
}

/** Compact mobile hero kept for backward-compat — small avatar + name link. */
export function ProfileHeroCompact(): React.ReactNode {
  const t = useT();
  const { data: user } = useCurrentUserQuery();

  const displayName = getDisplayName(user ?? null);
  const avatar = getAvatar(user ?? null);
  const isVerified = user?.isEmailVerified ?? false;

  return (
    <Link
      href="/profile"
      className="group inline-flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50"
    >
      <ProfileAvatar avatar={avatar} name={displayName} size="md" />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-400 transition-colors group-hover:text-ember-500">
          <span className="truncate">{displayName}</span>
          {isVerified && (
            <BadgeCheck
              className="h-3.5 w-3.5 shrink-0 text-ember-500"
              aria-label={t("public.profile.verified")}
            />
          )}
        </p>
        <p className="text-xs text-ink-100">{t("public.profile.hero.online")}</p>
      </div>
    </Link>
  );
}
