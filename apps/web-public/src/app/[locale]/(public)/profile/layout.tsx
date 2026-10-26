"use client";

import type { ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useT, useLocale } from "@eventflow/i18n/react";
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  Home,
  Settings,
  Ticket,
} from "lucide-react";

import { workspaceEntryUrl } from "@shared/config/urls";
import {
  useCurrentUserQuery,
  useLogoutMutation,
  useMyOrganizationsQuery,
} from "@shared/lib/hooks";
import { stripLocalePrefix, withLocalePath } from "@shared/lib/i18n-routing";
import { cn } from "@shared/lib/utils";
import { Container } from "@shared/ui/container";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { CompleteProfileInfoPopup } from "@widgets/profile/complete-profile-info-popup";
import { ProfileSidebarUserCard } from "@widgets/profile/hero";
import {
  ProfileErrorState,
  ProfileLoadingState,
} from "@widgets/profile/layout";
import { ProfileNavigation } from "@widgets/profile/navigation";

import type { LucideIcon } from "lucide-react";

type CurrentUser = ReturnType<typeof useCurrentUserQuery>["data"];
type LogoutMutation = ReturnType<typeof useLogoutMutation>;

interface BottomNavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
}

const bottomNavItems: BottomNavItem[] = [
  {
    id: "home",
    labelKey: "public.navigation.profileSection",
    href: "/profile",
    icon: Home,
  },
  {
    id: "events",
    labelKey: "public.navigation.myEvents",
    href: "/profile/events",
    icon: Ticket,
  },
  {
    id: "calendar",
    labelKey: "public.navigation.calendar",
    href: "/profile/calendar",
    icon: CalendarDays,
  },
  {
    id: "certificates",
    labelKey: "public.navigation.certificates",
    href: "/profile/certificates",
    icon: Award,
  },
  {
    id: "articles",
    labelKey: "public.navigation.saved",
    href: "/profile/articles",
    icon: BookOpen,
  },
  {
    id: "settings",
    labelKey: "public.navigation.settings",
    href: "/profile/settings",
    icon: Settings,
  },
];

export default function ProfileLayout({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  return <ProfileLayoutGate>{children}</ProfileLayoutGate>;
}

function ProfileLayoutGate({
  children,
}: {
  children: ReactNode;
}): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("authToken"));

  const {
    data: user,
    isLoading,
    error,
  } = useCurrentUserQuery({
    enabled: typeof window !== "undefined" && hasToken,
  });

  const logoutMutation = useLogoutMutation({
    redirectTo: "/login",
  });

  if (!isLoading && !user && hasToken) {
    router.push(withLocalePath("/login", locale));
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-bone-100/40 py-12">
        <Container size="wide">
          <ProfileLoadingState title={t("public.profile.loadingProfile")} />
        </Container>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="bg-bone-100/40 py-12">
        <Container size="wide">
          <ProfileErrorState
            title={t("public.profile.loadErrorTitle")}
            description={t("public.profile.loadErrorDescription")}
          />
        </Container>
      </div>
    );
  }

  return (
    <ProfileLayoutScaffold user={user ?? null} logoutMutation={logoutMutation}>
      {user?.needsProfileInfo && <CompleteProfileInfoPopup user={user} />}
      {children}
    </ProfileLayoutScaffold>
  );
}

function ProfileLayoutScaffold({
  children,
  user,
  logoutMutation: _logoutMutation,
}: {
  children: ReactNode;
  user: CurrentUser | null;
  logoutMutation: LogoutMutation;
}): React.ReactNode {
  const pathname = stripLocalePrefix(usePathname());

  return (
    <div className="min-h-screen bg-bone-100/40">
      <Container size="wide" className="py-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-10">
          <ProfileDesktopSidebar user={user} />

          <main className="min-w-0 pb-24 lg:pb-0">{children}</main>
        </div>
      </Container>

      <ProfileBottomNav pathname={pathname} />
    </div>
  );
}

function ProfileDesktopSidebar({
  user,
}: {
  user: CurrentUser | null;
}): React.ReactNode {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-5">
        <ProfileSidebarUserCard user={user} />
        <ProfileNavigation />
      </div>
    </aside>
  );
}

function ProfileBottomNav({
  pathname,
}: {
  pathname: string | null;
}): React.ReactNode {
  const t = useT();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bone-300/70 bg-bone-50/95 backdrop-blur-xl lg:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      aria-label={t("public.profile.quickNavigation")}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/profile" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50",
                isActive ? "text-ember-500" : "text-ink-100"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-ember-500" : "text-ink-50"
                )}
                aria-hidden
              />
              <span
                className={cn("leading-none", isActive && "font-semibold")}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}

        <WorkspaceBottomNavLink />
      </div>
    </nav>
  );
}

/**
 * Выход в рабочее пространство из нижней панели: на телефоне сайдбара нет, а
 * сотрудник должен переключаться между «участником» и «командой» так же легко.
 * Это не вкладка кабинета, а переход в другое приложение — поэтому со стрелкой
 * и в акцентном цвете. Пока организаций нет, пункта нет и панель прежняя.
 */
function WorkspaceBottomNavLink(): React.ReactNode {
  const t = useT();
  const { data: organizations } = useMyOrganizationsQuery();
  const { data: user } = useCurrentUserQuery();

  if (!organizations || organizations.length === 0) return null;

  return (
    <a
      href={workspaceEntryUrl(user?.email)}
      target="_blank"
      rel="noopener noreferrer"
      title={t("public.navigation.organizationsHint")}
      className={cn(
        "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium text-ember-500 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bone-50"
      )}
    >
      <span className="relative">
        <Building2 className="h-5 w-5 text-ember-500" aria-hidden />
        <ArrowUpRight
          className="absolute -right-1.5 -top-1 h-3 w-3 text-ember-400"
          aria-hidden
        />
      </span>
      <span className="w-full truncate text-center leading-none">
        {t("public.navigation.workspaceShort")}
      </span>
    </a>
  );
}
