"use client";

import { usePathname } from "next/navigation";

import { useT } from "@eventflow/i18n/react";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  Home,
  LogOut,
  Settings,
  Ticket,
} from "lucide-react";

import { workspaceEntryUrl } from "@shared/config/urls";
import {
  useCertificatesStatsQuery,
  useCurrentMonthCalendar,
  useCurrentUserQuery,
  useLogoutMutation,
  useMyOrganizationsQuery,
  useUserEventsQuery,
} from "@shared/lib/hooks";
import { stripLocalePrefix } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { Surface } from "@shared/ui/surface";

import type { LucideIcon } from "lucide-react";

interface NavItemConfig {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  group: "main" | "settings";
  badge?: string;
}

const staticNavItems: NavItemConfig[] = [
  {
    id: "home",
    labelKey: "public.navigation.profileSection",
    href: "/profile",
    icon: Home,
    group: "main",
  },
  {
    id: "events",
    labelKey: "public.navigation.myEvents",
    href: "/profile/events",
    icon: Ticket,
    group: "main",
  },
  {
    id: "calendar",
    labelKey: "public.navigation.calendar",
    href: "/profile/calendar",
    icon: CalendarDays,
    group: "main",
  },
  {
    id: "certificates",
    labelKey: "public.navigation.certificates",
    href: "/profile/certificates",
    icon: Award,
    group: "main",
  },
  {
    id: "articles",
    labelKey: "public.navigation.saved",
    href: "/profile/articles",
    icon: BookOpen,
    group: "main",
  },
  {
    id: "settings",
    labelKey: "public.navigation.settings",
    href: "/profile/settings",
    icon: Settings,
    group: "settings",
  },
];

export function ProfileNavigation(): React.ReactNode {
  const t = useT();
  const pathname = stripLocalePrefix(usePathname());

  const { data: calendarData } = useCurrentMonthCalendar({ enabled: true });
  const calendarEventsCount = calendarData?.eventsCount;

  const { data: eventsData } = useUserEventsQuery({});
  const { data: certificatesStats } = useCertificatesStatsQuery();
  const eventsStats = eventsData?.stats;
  const certificatesCount = certificatesStats?.totalCertificates ?? 0;

  const logoutMutation = useLogoutMutation({ redirectTo: "/login" });

  const handleLogout = (): void => {
    logoutMutation.mutate();
  };

  const navItems = staticNavItems.map((item) => {
    if (
      item.id === "calendar" &&
      calendarEventsCount !== undefined &&
      calendarEventsCount > 0
    ) {
      return { ...item, badge: String(calendarEventsCount) };
    }
    if (
      item.id === "events" &&
      eventsStats?.totalEvents !== undefined &&
      eventsStats.totalEvents > 0
    ) {
      return { ...item, badge: String(eventsStats.totalEvents) };
    }
    if (item.id === "certificates" && certificatesCount > 0) {
      return { ...item, badge: String(certificatesCount) };
    }
    return item;
  });

  const mainItems = navItems.filter((item) => item.group === "main");
  const settingsItems = navItems.filter((item) => item.group === "settings");

  return (
    <Surface
      variant="solid"
      radius="xl"
      padding="xs"
      className="border border-bone-300/60"
    >
      <nav
        className="flex flex-col gap-1"
        aria-label={t("public.profile.navigationAria")}
      >
        <div className="space-y-0.5">
          {mainItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/profile" && pathname?.startsWith(item.href));
            return <NavLink key={item.id} item={item} isActive={isActive} />;
          })}
        </div>

        <SidebarOrganizations />

        <div className="my-1.5 border-t border-bone-200" />

        <div className="space-y-0.5">
          {settingsItems.map((item) => {
            const isActive = pathname?.startsWith(item.href) ?? false;
            return <NavLink key={item.id} item={item} isActive={isActive} />;
          })}
        </div>

        <div className="mt-1.5 border-t border-bone-200 pt-1.5">
          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors",
              "hover:bg-[var(--danger-soft)]/60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
              "disabled:opacity-50"
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span>
              {logoutMutation.isPending
                ? t("public.profile.loggingOut")
                : t("public.profile.logout")}
            </span>
          </button>
        </div>
      </nav>
    </Surface>
  );
}

/**
 * Вход в рабочее пространство прямо из бокового меню кабинета: человек, который
 * принял приглашение, одновременно участник и сотрудник, и переключение между
 * этими ролями должно быть на виду, а не только в меню аккаунта в шапке.
 * Пока организаций нет, секции нет.
 */
function SidebarOrganizations(): React.ReactNode {
  const t = useT();
  const { data: organizations } = useMyOrganizationsQuery();
  const { data: user } = useCurrentUserQuery();

  if (!organizations || organizations.length === 0) return null;

  return (
    <>
      <div className="my-1.5 border-t border-bone-200" />
      <div className="space-y-0.5">
        <p className="px-3 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-100">
          {t("public.navigation.organizationsSection")}
        </p>
        {organizations.map((organization) => (
          <a
            key={organization.organizationId}
            href={workspaceEntryUrl(user?.email)}
            target="_blank"
            rel="noopener noreferrer"
            title={t("public.navigation.organizationsHint")}
            className={cn(
              "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-ink-200 hover:bg-bone-200/70 hover:text-ink-400",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50"
            )}
          >
            <Building2
              className="h-4 w-4 shrink-0 text-ink-100 transition-colors group-hover:text-ink-300"
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{organization.name}</span>
            <ArrowUpRight
              className="h-3.5 w-3.5 shrink-0 text-ink-50"
              aria-hidden
            />
          </a>
        ))}
      </div>
    </>
  );
}

interface NavLinkProps {
  item: NavItemConfig;
  isActive: boolean;
}

function NavLink({ item, isActive }: NavLinkProps): React.ReactNode {
  const t = useT();

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
        isActive
          ? "bg-ember-50 text-ember-500"
          : "text-ink-200 hover:bg-bone-200/70 hover:text-ink-400"
      )}
    >
      <span className="flex items-center gap-2.5">
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? "text-ember-500" : "text-ink-100 group-hover:text-ink-300"
          )}
          aria-hidden
        />
        <span>{t(item.labelKey)}</span>
      </span>

      {item.badge && (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
            isActive
              ? "bg-ember-500 text-bone-50"
              : "bg-bone-300 text-ink-200"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
