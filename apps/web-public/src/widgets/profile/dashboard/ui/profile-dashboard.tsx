"use client";

import { useT } from "@eventflow/i18n/react";
import {
  ArrowRight,
  Award,
  Briefcase,
  Calendar,
  MapPin,
  Search,
  Ticket,
  User,
} from "lucide-react";

import { useProfileOptionsQuery } from "@features/profile/complete-profile-info";
import {
  useCertificatesStatsQuery,
  useCurrentUserQuery,
  useSavedArticlesQuery,
  useSavedBlogPostsQuery,
  useUserEventsQuery,
} from "@shared/lib/hooks";
import { cn, formatDateOfBirthDisplay } from "@shared/lib/utils";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";
import { ProfileHero } from "@widgets/profile/hero";
import { ProfileSection } from "@widgets/profile/layout";
import { ProfileEventsCatalog } from "@widgets/profile/events-catalog";
import { ProfileFeaturedEventsSlider } from "@widgets/profile/featured-events";
import { ProfileTeamInvites } from "@widgets/profile/team-invites";

import type { LucideIcon } from "lucide-react";
import type { User as UserType } from "@shared/api";

interface QuickAction {
  id: string;
  titleKey: string;
  descriptionKey: string;
  href: string;
  icon: LucideIcon;
  tone: "ember" | "forest";
}

const quickActions: QuickAction[] = [
  {
    id: "find-events",
    titleKey: "public.profile.dashboard.actions.findEventsTitle",
    descriptionKey: "public.profile.dashboard.actions.findEventsDescription",
    href: "/events",
    icon: Search,
    tone: "ember",
  },
  {
    id: "my-tickets",
    titleKey: "public.profile.dashboard.actions.myTicketsTitle",
    descriptionKey: "public.profile.dashboard.actions.myTicketsDescription",
    href: "/profile/events",
    icon: Ticket,
    tone: "ember",
  },
  {
    id: "calendar",
    titleKey: "public.profile.dashboard.actions.calendarTitle",
    descriptionKey: "public.profile.dashboard.actions.calendarDescription",
    href: "/profile/calendar",
    icon: Calendar,
    tone: "forest",
  },
  {
    id: "certificates",
    titleKey: "public.profile.dashboard.actions.certificatesTitle",
    descriptionKey: "public.profile.dashboard.actions.certificatesDescription",
    href: "/profile/certificates",
    icon: Award,
    tone: "ember",
  },
];

function hasExtraProfileInfo(user: UserType | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    user.shortBio?.trim() ||
      user.region?.trim() ||
      user.gender ||
      user.dateOfBirth?.trim() ||
      (user.languages?.length ?? 0) > 0 ||
      user.profileStatus ||
      user.workOrStudyPlace?.trim() ||
      (user.skills?.length ?? 0) > 0 ||
      user.specialization
  );
}

function ProfileIdentityHeader(): React.ReactNode {
  const { data: eventsData } = useUserEventsQuery({});
  const { data: certificatesStats } = useCertificatesStatsQuery();
  const { data: articlesData } = useSavedArticlesQuery({ page: 1, limit: 1 });
  const { data: savedPostsData } = useSavedBlogPostsQuery(
    { page: 1, limit: 1 },
    { enabled: true }
  );

  const eventsCount = eventsData?.stats?.totalEvents ?? 0;
  const certificatesCount = certificatesStats?.totalCertificates ?? 0;
  const savedCount = (articlesData?.total ?? 0) + (savedPostsData?.total ?? 0);

  return (
    <ProfileHero
      eventsCount={eventsCount}
      certificatesCount={certificatesCount}
      savedCount={savedCount}
    />
  );
}

export function ProfileDashboardSection(): React.ReactNode {
  const t = useT();
  const { data: user } = useCurrentUserQuery();
  const { data: profileOptions } = useProfileOptionsQuery();
  const showExtraInfo = hasExtraProfileInfo(user) && profileOptions;

  return (
    <div className="space-y-10">
      <ProfileIdentityHeader />

      {/* Приглашение в команду ждёт ответа — показываем сразу под шапкой,
          выше всего остального: у него ограниченный срок. */}
      <ProfileTeamInvites />

      {showExtraInfo && user && (
        <AboutYouSection user={user} />
      )}

      <ProfileSection
        eyebrow={t("public.profile.dashboard.quickActions")}
        delay={0.05}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.id} action={action} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection delay={0.1}>
        <ProfileFeaturedEventsSlider />
      </ProfileSection>

      <ProfileSection delay={0.15}>
        <ProfileEventsCatalog />
      </ProfileSection>
    </div>
  );
}

interface AboutYouSectionProps {
  user: UserType;
}

function AboutYouSection({ user }: AboutYouSectionProps): React.ReactNode {
  const t = useT();
  const { data: profileOptions } = useProfileOptionsQuery();

  const getLabel = {
    gender: (value: string): string =>
      profileOptions?.genders.find((g) => g.value === value)?.label ?? value,
    profileStatus: (value: string): string =>
      profileOptions?.profileStatuses.find((s) => s.value === value)?.label ??
      value,
    specialization: (value: string): string =>
      profileOptions?.specializations.find((s) => s.value === value)?.label ??
      value,
    language: (code: string): string =>
      profileOptions?.languages.find((l) => l.code === code)?.label ?? code,
    skill: (code: string): string =>
      profileOptions?.skills.find((s) => s.code === code)?.label ?? code,
  };

  const fields: { key: string; label: string; value: string; icon: LucideIcon }[] = [];
  if (user.gender)
    fields.push({
      key: "gender",
      label: t("public.profile.dashboard.gender"),
      value: getLabel.gender(user.gender),
      icon: User,
    });
  if (user.dateOfBirth)
    fields.push({
      key: "dob",
      label: t("public.profile.dashboard.birthDate"),
      value: formatDateOfBirthDisplay(user.dateOfBirth),
      icon: Calendar,
    });
  if (user.region)
    fields.push({
      key: "region",
      label: t("public.profile.dashboard.region"),
      value: user.region,
      icon: MapPin,
    });
  if (user.profileStatus)
    fields.push({
      key: "status",
      label: t("public.profile.dashboard.status"),
      value: getLabel.profileStatus(user.profileStatus),
      icon: Briefcase,
    });
  if (user.specialization)
    fields.push({
      key: "specialization",
      label: t("public.profile.dashboard.specialization"),
      value: getLabel.specialization(user.specialization),
      icon: Award,
    });

  return (
    <ProfileSection delay={0.05}>
      <Surface
        variant="solid"
        radius="xl"
        padding="lg"
        className="border border-bone-300/60"
      >
        <div className="flex items-center justify-between gap-3 border-b border-bone-200 pb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-ember-500" aria-hidden />
            <h2 className="text-base font-semibold text-ink-400">
              {t("public.profile.dashboard.aboutYou")}
            </h2>
          </div>
          <Link
            href="/profile/settings"
            className="text-sm font-semibold text-ember-500 hover:text-ember-600"
          >
            {t("public.profile.dashboard.editInSettings")}
          </Link>
        </div>

        <div className="mt-5 space-y-5">
          {user.shortBio?.trim() && (
            <p className="text-sm leading-relaxed text-ink-200">
              {user.shortBio}
            </p>
          )}

          {fields.length > 0 && (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-start gap-3 rounded-lg border border-bone-200 bg-bone-100/60 px-3.5 py-3"
                >
                  <field.icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink-100"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                      {field.label}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium text-ink-300">
                      {field.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {user.workOrStudyPlace?.trim() && (
            <div className="flex items-start gap-3 rounded-lg border border-bone-200 bg-bone-100/60 px-3.5 py-3">
              <Briefcase
                className="mt-0.5 h-4 w-4 shrink-0 text-ink-100"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                  {t("public.profile.dashboard.workOrStudy")}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium text-ink-300">
                  {user.workOrStudyPlace}
                </p>
              </div>
            </div>
          )}

          {(user.languages?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                {t("public.profile.dashboard.languages")}
              </p>
              <div className="flex flex-wrap gap-2">
                {user.languages?.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border border-ember-100 bg-ember-50 px-2.5 py-1 text-xs font-semibold text-ember-600"
                  >
                    {getLabel.language(code)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(user.skills?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-100">
                {t("public.profile.dashboard.skills")}
              </p>
              <div className="flex flex-wrap gap-2">
                {user.skills?.map((code) => (
                  <span
                    key={code}
                    className="rounded-md border border-bone-300 bg-bone-50 px-2.5 py-1 text-xs font-semibold text-ink-200"
                  >
                    {getLabel.skill(code)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Surface>
    </ProfileSection>
  );
}

function QuickActionCard({ action }: { action: QuickAction }): React.ReactNode {
  const t = useT();
  const toneClasses =
    action.tone === "forest"
      ? "bg-forest-50 text-forest-600 group-hover:bg-forest-100"
      : "bg-ember-50 text-ember-500 group-hover:bg-ember-100";

  return (
    <Link
      href={action.href}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-100"
    >
      <Surface
        variant="solid"
        radius="xl"
        padding="md"
        className={cn(
          "h-full border border-bone-300/60 transition-colors duration-200",
          "hover:border-bone-400"
        )}
      >
        <div
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
            toneClasses
          )}
        >
          <action.icon className="h-5 w-5" aria-hidden />
        </div>

        <h3 className="text-[15px] font-semibold leading-snug text-ink-400">
          {t(action.titleKey)}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-100">
          {t(action.descriptionKey)}
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-200 transition-colors group-hover:text-ember-500">
          <span>{t("actions.open")}</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </Surface>
    </Link>
  );
}
