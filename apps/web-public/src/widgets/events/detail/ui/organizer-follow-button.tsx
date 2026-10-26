"use client";

import { Bell, BellOff } from "lucide-react";

import { AnimatedToggleButton } from "@shared/ui";

interface OrganizerFollowButtonProps {
  isFollowing: boolean;
  isLoading: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  followLabel: string;
  unfollowLabel: string;
  ariaFollow: string;
  ariaUnfollow: string;
  className?: string;
}

/**
 * Pill-style follow toggle for an organizer card. Reads as a single
 * stateful control rather than two opposing buttons — labels and icons
 * cross-fade on press, and the underlying mutations carry optimistic
 * updates so the new state lands instantly.
 */
export function OrganizerFollowButton({
  isFollowing,
  isLoading,
  onFollow,
  onUnfollow,
  followLabel,
  unfollowLabel,
  ariaFollow,
  ariaUnfollow,
  className,
}: OrganizerFollowButtonProps) {
  return (
    <AnimatedToggleButton
      variant="pill"
      flavor="follow"
      size="sm"
      isActive={isFollowing}
      isLoading={isLoading}
      onToggle={(next) => (next ? onFollow() : onUnfollow())}
      idleIcon={<Bell className="size-4" aria-hidden />}
      activeIcon={<BellOff className="size-4" aria-hidden />}
      idleLabel={followLabel}
      activeLabel={unfollowLabel}
      ariaLabelIdle={ariaFollow}
      ariaLabelActive={ariaUnfollow}
      className={className}
    />
  );
}
