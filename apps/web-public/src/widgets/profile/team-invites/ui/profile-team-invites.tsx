"use client";

import { useState } from "react";

import { formatDate } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { workspaceEntryUrl } from "@shared/config/urls";
import {
  useAcceptMyOrganizationInviteMutation,
  useCurrentUserQuery,
  useDeclineMyOrganizationInviteMutation,
  useMyOrganizationInvitesQuery,
  type MyInvite,
} from "@shared/lib/hooks";
import { Button, buttonStyles } from "@shared/ui/button";
import { SafeImage } from "@shared/ui/safe-image";
import { Surface } from "@shared/ui/surface";

import { DeclineInviteDialog } from "./decline-invite-dialog";

/** Сколько дней осталось до конца срока — округляем вверх, «сегодня» = 0. */
function daysLeft(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function OrganizationLogo({ invite }: { invite: MyInvite }): React.ReactNode {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-bone-300/60 bg-bone-100">
      {invite.organizationLogoUrl ? (
        <div className="relative h-full w-full">
          <SafeImage
            src={invite.organizationLogoUrl}
            alt={invite.organizationName}
            fill
            sizes="48px"
            className="object-cover"
          />
        </div>
      ) : (
        <Building2 className="h-5 w-5 text-ink-200" aria-hidden />
      )}
    </div>
  );
}

/** Кто зовёт, кем и до какого числа. */
function PendingInviteSummary({ invite }: { invite: MyInvite }): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const left = daysLeft(invite.expiresAt);

  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember-500">
        {t("public.profile.teamInvites.eyebrow")}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-ink-400">
        {invite.organizationName}
      </p>
      <p className="mt-0.5 text-sm text-ink-200">
        {t("public.profile.teamInvites.description", { role: invite.role.name })}
      </p>
      <p className="mt-1 text-xs text-ink-200/80">
        {left === 0
          ? t("public.profile.teamInvites.expiresToday")
          : t("public.profile.teamInvites.expiresIn", {
              days: left,
              date: formatDate(invite.expiresAt, locale, {
                day: "numeric",
                month: "long",
              }),
            })}
      </p>
    </div>
  );
}

interface PendingInviteCardProps {
  invite: MyInvite;
  onAccepted: (invite: MyInvite) => void;
  onDeclined: (invite: MyInvite) => void;
}

function PendingInviteCard({
  invite,
  onAccepted,
  onDeclined,
}: PendingInviteCardProps): React.ReactNode {
  const t = useT();
  const accept = useAcceptMyOrganizationInviteMutation();
  const decline = useDeclineMyOrganizationInviteMutation();
  const [declineOpen, setDeclineOpen] = useState(false);
  const busy = accept.isPending || decline.isPending;

  const handleAccept = (): void => {
    accept.mutate(invite.id, {
      onSuccess: () => {
        toast.success(
          t("public.profile.teamInvites.acceptedToast", {
            organization: invite.organizationName,
          })
        );
        onAccepted(invite);
      },
      onError: (error) => {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : t("public.profile.teamInvites.error")
        );
      },
    });
  };

  const handleDecline = (reason: string): void => {
    decline.mutate(
      { inviteId: invite.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setDeclineOpen(false);
          toast.success(t("public.profile.teamInvites.declinedToast"));
          onDeclined(invite);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : t("public.profile.teamInvites.declineError")
          );
        },
      }
    );
  };

  return (
    <Surface variant="solid" radius="xl" padding="md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <OrganizationLogo invite={invite} />
          <PendingInviteSummary invite={invite} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeclineOpen(true)}
            disabled={busy}
          >
            <X className="mr-1.5 h-4 w-4" aria-hidden />
            {t("public.profile.teamInvites.decline")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAccept}
            disabled={busy}
          >
            {accept.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {t("public.profile.teamInvites.accept")}
          </Button>
        </div>
      </div>

      {declineOpen && (
        <DeclineInviteDialog
          open
          organizationName={invite.organizationName}
          isPending={decline.isPending}
          onOpenChange={setDeclineOpen}
          onConfirm={handleDecline}
        />
      )}
    </Surface>
  );
}

/**
 * Итог по принятому приглашению. Живёт отдельно от списка: сразу после accept
 * приглашение уходит из выборки, и раньше карточка просто исчезала — человек
 * не понимал, сработало ли. Теперь на её месте остаётся подтверждение с
 * переходом в рабочее пространство.
 */
function AcceptedInviteCard({ invite }: { invite: MyInvite }): React.ReactNode {
  const t = useT();
  const { data: user } = useCurrentUserQuery();

  return (
    <Surface variant="solid" radius="xl" padding="md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <OrganizationLogo invite={invite} />
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-forest-500">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              {t("public.profile.teamInvites.acceptedEyebrow")}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-ink-400">
              {invite.organizationName}
            </p>
            <p className="mt-0.5 text-sm text-ink-200">
              {t("public.profile.teamInvites.acceptedDescription", {
                role: invite.role.name,
              })}
            </p>
          </div>
        </div>

        <a
          href={workspaceEntryUrl(user?.email)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ variant: "primary", size: "sm" })}
        >
          {t("public.profile.teamInvites.openWorkspace")}
          <ArrowUpRight className="ml-1.5 h-4 w-4" aria-hidden />
        </a>
      </div>
    </Surface>
  );
}

/**
 * Приглашения в команду организации в кабинете участника.
 *
 * Раньше о приглашении сообщало только письмо: оно теряется, уходит в спам или
 * открывается не на том устройстве, и человек ничего не мог сделать. Теперь
 * приглашение видно там, где человек уже авторизован: его можно принять или
 * отклонить с комментарием. Пока приглашений нет — блок не занимает места.
 */
export function ProfileTeamInvites(): React.ReactNode {
  const t = useT();
  const { data: invites } = useMyOrganizationInvitesQuery();
  const [accepted, setAccepted] = useState<MyInvite[]>([]);
  const [declinedIds, setDeclinedIds] = useState<string[]>([]);

  const acceptedIds = new Set(accepted.map((invite) => invite.id));
  const pending = (invites ?? []).filter(
    (invite) =>
      !acceptedIds.has(invite.id) && !declinedIds.includes(invite.id)
  );

  if (pending.length === 0 && accepted.length === 0) return null;

  const total = pending.length + accepted.length;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-ink-200">
        <UserPlus className="h-4 w-4" aria-hidden />
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em]">
          {total > 1
            ? t("public.profile.teamInvites.titleMany", { count: total })
            : t("public.profile.teamInvites.title")}
        </h2>
      </div>
      <div className="space-y-2.5">
        {accepted.map((invite) => (
          <AcceptedInviteCard key={invite.id} invite={invite} />
        ))}
        {pending.map((invite) => (
          <PendingInviteCard
            key={invite.id}
            invite={invite}
            onAccepted={(accepted) =>
              setAccepted((prev) => [...prev, accepted])
            }
            onDeclined={(declined) =>
              setDeclinedIds((prev) => [...prev, declined.id])
            }
          />
        ))}
      </div>
    </section>
  );
}
