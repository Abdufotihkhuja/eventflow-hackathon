import { useCallback, useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  Building2,
  CalendarDays,
  LayoutDashboard,
  Plus,
  Settings,
  Users,
  KanbanSquare,
  User,
  ShieldCheck,
  FileText,
  UserPlus,
  MessageSquare,
  MapPinned,
} from "lucide-react";
import { useT } from "@eventflow/i18n/react";

import { clearAuthTokens, getMediaUrl } from "@api/config";
import {
  useCurrentUser,
  useActorType,
  isOrganizationUser,
  isMemberUser,
  useMemberPermissions,
  CompanyInfoDialog,
} from "@features/profile";
import { useEventsCountQuery } from "@features/events/api";
import {
  AdminLayout,
  type BreadcrumbItem,
  type NavigationGroup,
} from "@widgets/admin-layout";

import { clearAppQueryCache } from "@shared/lib/query-client";
import { Button } from "@shared/ui";
import { Toaster } from "sonner";

// ================================
// Permission Codes для фильтрации навигации
// ================================

const PERMISSION_CODES = {
  // События
  EVENTS_VIEW: "events:read",
  EVENTS_CREATE: "events:create",
  EVENTS_MANAGE: "events:manage",

  // Задачи (доски)
  TASKS_VIEW: "tasks:read",
  TASKS_CREATE: "tasks:create",
  TASKS_MANAGE: "tasks:manage",

  // Пользователи (сотрудники)
  MEMBERS_VIEW: "members:read",
  MEMBERS_CREATE: "members:create",
  MEMBERS_MANAGE: "members:manage",

  // Регистрации
  REGISTRATIONS_VIEW: "registrations:read",
  REGISTRATIONS_MANAGE: "registrations:manage",

  // Статистика
  STATS_VIEW: "stats:read",
} as const;

// ================================
// Navigation Config
// ================================

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  end?: boolean;
  badge?: number;
  /** Требуемые коды прав (хотя бы один) */
  permissions?: string[];
  /** Только для организации */
  organizationOnly?: boolean;
};

type NavGroup = {
  labelKey?: string;
  items: NavItem[];
};

const fullNavigation: NavGroup[] = [
  {
    items: [
      {
        href: "/dashboard",
        labelKey: "workspace.layout.navigation.dashboard",
        icon: <LayoutDashboard className="h-5 w-5" />,
        end: true,
        permissions: [PERMISSION_CODES.STATS_VIEW],
      },
    ],
  },
  {
    labelKey: "workspace.layout.navigationGroups.management",
    items: [
      {
        href: "/my-events",
        labelKey: "workspace.layout.navigation.myEvents",
        icon: <CalendarDays className="h-5 w-5" />,
        permissions: [
          PERMISSION_CODES.EVENTS_VIEW,
          PERMISSION_CODES.EVENTS_MANAGE,
        ],
        organizationOnly: true,
      },
      {
        href: "/my-blog",
        labelKey: "workspace.layout.navigation.myBlog",
        icon: <FileText className="h-5 w-5" />,
        organizationOnly: true, // Только организация может управлять блогом
      },
      {
        href: "/tasks/boards",
        labelKey: "workspace.layout.navigation.tasks",
        icon: <KanbanSquare className="h-5 w-5" />,
        permissions: [
          PERMISSION_CODES.TASKS_VIEW,
          PERMISSION_CODES.TASKS_MANAGE,
        ],
      },
      {
        href: "/users",
        labelKey: "workspace.layout.navigation.users",
        icon: <Users className="h-5 w-5" />,
        permissions: [
          PERMISSION_CODES.MEMBERS_VIEW,
          PERMISSION_CODES.MEMBERS_MANAGE,
        ],
        organizationOnly: true, // Только организация может управлять сотрудниками
      },
      {
        href: "/followers",
        labelKey: "workspace.layout.navigation.followers",
        icon: <UserPlus className="h-5 w-5" />,
        organizationOnly: true,
      },
      {
        href: "/contacts",
        labelKey: "workspace.layout.navigation.contacts",
        icon: <MessageSquare className="h-5 w-5" />,
        organizationOnly: true,
      },
      {
        href: "/places",
        labelKey: "workspace.layout.navigation.placesCatalog",
        icon: <MapPinned className="h-5 w-5" />,
      },
      {
        href: "/my-places",
        labelKey: "workspace.layout.navigation.myPlaces",
        icon: <Building2 className="h-5 w-5" />,
        organizationOnly: true,
      },
    ],
  },
  {
    labelKey: "workspace.layout.navigationGroups.system",
    items: [
      {
        href: "/profile",
        labelKey: "workspace.layout.navigation.profile",
        icon: <User className="h-5 w-5" />,
        // Доступен всем
      },
      {
        href: "/settings",
        labelKey: "workspace.layout.navigation.settings",
        icon: <Settings className="h-5 w-5" />,
        // Доступен всем
      },
      {
        href: "/security",
        labelKey: "workspace.layout.navigation.security",
        icon: <ShieldCheck className="h-5 w-5" />,
        // Доступен всем
      },
    ],
  },
];

// Конфигурация для breadcrumbs, title и actions для каждого роута
const routeConfig: Record<
  string,
  {
    titleKey: string;
    descriptionKey?: string;
    breadcrumbKeys?: Array<{ labelKey: string; href?: string }>;
    showCreateButton?: boolean;
    createPermission?: string;
  }
> = {
  "/dashboard": {
    titleKey: "workspace.layout.routes.dashboard.title",
    descriptionKey: "workspace.layout.routes.dashboard.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.dashboard.title" },
    ],
  },
  "/my-events": {
    titleKey: "workspace.layout.routes.myEvents.title",
    descriptionKey: "workspace.layout.routes.myEvents.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.myEvents.title" },
    ],
  },
  "/users": {
    titleKey: "workspace.layout.routes.users.title",
    descriptionKey: "workspace.layout.routes.users.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.users.title" },
    ],
  },
  "/tasks/boards": {
    titleKey: "workspace.layout.routes.boards.title",
    descriptionKey: "workspace.layout.routes.boards.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.navigation.tasks" },
    ],
  },
  "/profile": {
    titleKey: "workspace.layout.routes.profile.title",
    descriptionKey: "workspace.layout.routes.profile.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.profile.title" },
    ],
  },
  "/settings": {
    titleKey: "workspace.layout.routes.settings.title",
    descriptionKey: "workspace.layout.routes.settings.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.settings.title" },
    ],
  },
  "/security": {
    titleKey: "workspace.layout.routes.security.title",
    descriptionKey: "workspace.layout.routes.security.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.security.title" },
    ],
  },
  "/my-blog": {
    titleKey: "workspace.layout.routes.myBlog.title",
    descriptionKey: "workspace.layout.routes.myBlog.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.myBlog.title" },
    ],
  },
  "/followers": {
    titleKey: "workspace.layout.routes.followers.title",
    descriptionKey: "workspace.layout.routes.followers.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.followers.title" },
    ],
  },
  "/contacts": {
    titleKey: "workspace.layout.routes.contacts.title",
    descriptionKey: "workspace.layout.routes.contacts.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.contacts.title" },
    ],
  },
  "/my-places": {
    titleKey: "workspace.layout.routes.myPlaces.title",
    descriptionKey: "workspace.layout.routes.myPlaces.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.myPlaces.title" },
    ],
  },
  "/places": {
    titleKey: "workspace.layout.routes.places.title",
    descriptionKey: "workspace.layout.routes.places.description",
    breadcrumbKeys: [
      { labelKey: "workspace.layout.routes.home", href: "/" },
      { labelKey: "workspace.layout.routes.places.title" },
    ],
  },
};

function getRouteConfig(pathname: string, t: ReturnType<typeof useT>) {
  const exact = routeConfig[pathname];
  if (exact) {
    return {
      ...exact,
      title: t(exact.titleKey),
      description: exact.descriptionKey ? t(exact.descriptionKey) : undefined,
      breadcrumbs: exact.breadcrumbKeys?.map((item) => ({
        label: t(item.labelKey),
        href: item.href,
      })),
    };
  }
  if (pathname.startsWith("/places/") && pathname !== "/places") {
    return {
      title: t("workspace.layout.routes.place.title"),
      description: t("workspace.layout.routes.place.description"),
      breadcrumbs: [
        { label: t("workspace.layout.routes.home"), href: "/" },
        { label: t("workspace.layout.routes.places.title"), href: "/places" },
        { label: t("workspace.layout.routes.place.title") },
      ],
    };
  }
  return {
    title: t("workspace.layout.routes.page.title"),
    breadcrumbs: [] as BreadcrumbItem[],
  };
}

// ================================
// Protected Layout
// ================================

export function ProtectedLayout() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const actorType = useActorType();

  const {
    data: currentUser,
    isError: isUserError,
    isLoading: isUserLoading,
  } = useCurrentUser();

  // Определяем тип из реальных данных API, с fallback на localStorage
  const isMember = currentUser
    ? currentUser.type === "member"
    : actorType === "member";

  // Запрашиваем права только для member, не для организации
  const { data: memberPermissions } = useMemberPermissions({
    enabled: isMember,
  });
  // Получаем количество событий для badge в навигации
  const { data: eventsCount } = useEventsCountQuery();

  // Если профиль не загрузился — сессия невалидна, разлогиниваем
  useEffect(() => {
    if (isUserError && !isUserLoading) {
      clearAuthTokens();
      clearAppQueryCache();
      navigate("/login", { replace: true });
    }
  }, [isUserError, isUserLoading, navigate]);

  // Собираем все коды прав member
  const permissionCodes = useMemo(() => {
    if (!isMember) return new Set<string>();

    const codes = new Set<string>();
    memberPermissions?.allPermissions?.forEach((p) => codes.add(p.code));
    memberPermissions?.permissions?.forEach((code) => codes.add(code));
    return codes;
  }, [isMember, memberPermissions]);

  const isOrganization = currentUser?.type === "organization";

  // Проверка наличия права
  const hasPermission = useCallback(
    (requiredPermissions?: string[]): boolean => {
      // Организация имеет все права
      if (isOrganization) return true;

      // Если права не указаны — доступ есть
      if (!requiredPermissions || requiredPermissions.length === 0) return true;

      // Проверяем наличие хотя бы одного права
      return requiredPermissions.some((code) => permissionCodes.has(code));
    },
    [isOrganization, permissionCodes],
  );

  // Фильтруем навигацию по правам и добавляем динамические badge
  const filteredNavigation = useMemo((): NavigationGroup[] => {
    const placesEnabled =
      isOrganizationUser(currentUser) && currentUser.data.placesFeatureEnabled;

    return fullNavigation
      .map((group) => ({
        label: group.labelKey ? t(group.labelKey) : undefined,
        items: group.items
          .filter((item) => {
            // Скрываем organization-only пункты для не-организаций
            if (item.organizationOnly && !isOrganization) return false;
            if (item.href === "/my-places" && !placesEnabled) return false;

            // Проверка permissions
            return hasPermission(item.permissions);
          })
          .map((item) => {
            const localizedItem = { ...item, label: t(item.labelKey) };
            if (
              item.href === "/my-events" &&
              eventsCount !== undefined &&
              eventsCount > 0
            ) {
              return { ...localizedItem, badge: eventsCount };
            }
            return localizedItem;
          }),
      }))
      .filter((group) => group.items.length > 0);
  }, [currentUser, isOrganization, hasPermission, eventsCount, t]);

  const currentRoute = getRouteConfig(location.pathname, t);

  // Проверяем право на создание события
  const canCreateEvent = hasPermission([
    PERMISSION_CODES.EVENTS_CREATE,
    PERMISSION_CODES.EVENTS_MANAGE,
  ]);

  const showCreateButton = currentRoute.showCreateButton && canCreateEvent;

  const handleLogout = () => {
    clearAuthTokens();
    clearAppQueryCache();
    navigate("/login", { replace: true });
  };

  const handleNotificationsClick = () => {
    console.log("Notifications clicked");
  };

  const handleCreateEvent = () => {
    navigate("/my-events/create");
  };

  // Получаем данные для header
  const getUserDisplayData = () => {
    if (isMemberUser(currentUser)) {
      const member = currentUser.data;
      return {
        avatar: getMediaUrl(member.avatarUrl),
        name: `${member.firstName} ${member.lastName}`.trim(),
        email: member.email,
        inn: null, // Member не имеет ИНН, только организация
      };
    }

    if (isOrganizationUser(currentUser)) {
      const org = currentUser.data;
      return {
        avatar: getMediaUrl(org.logoUrl),
        name: org.organizationName,
        email: org.email,
        inn: org.inn,
      };
    }

    return {
      avatar: undefined,
      name: t("workspace.layout.navbar.defaultUser"),
      email: "",
      inn: null,
    };
  };

  const userData = getUserDisplayData();

  const showCompanyInfoPopup =
    isOrganizationUser(currentUser) &&
    currentUser.data.needsCompanyInfo === true;

  return (
    <>
      <AdminLayout
        title={currentRoute.title}
        description={currentRoute.description}
        breadcrumbs={currentRoute.breadcrumbs}
        actions={
          showCreateButton ? (
            <Button
              onClick={handleCreateEvent}
              className="border-none bg-brand-secondary font-semibold text-white shadow-lg transition hover:bg-brand-secondary/90 hover:shadow-xl"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t("workspace.layout.actions.createEvent")}
            </Button>
          ) : undefined
        }
        navigation={filteredNavigation}
        userAvatar={userData.avatar}
        userName={userData.name}
        userEmail={userData.email}
        organizationInn={userData.inn}
        notificationCount={3}
        onLogout={handleLogout}
        profileHref="/profile"
        settingsHref="/settings"
        onNotificationsClick={handleNotificationsClick}
        sidebarFooter={
          <div>
            <p className="text-xs font-semibold">
              {t("workspace.layout.sidebar.tipTitle")}
            </p>
            <p className="mt-1 text-xs">
              {t("workspace.layout.sidebar.tipHotkeys")}
            </p>
          </div>
        }
      >
        <Outlet />
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border-border bg-popover text-popover-foreground shadow-lg shadow-black/10",
              title: "text-sm font-medium",
              description: "text-xs text-muted-foreground",
              success: "border-emerald-500/25",
              error: "border-destructive/30",
            },
          }}
        />
      </AdminLayout>
      {showCompanyInfoPopup && isOrganizationUser(currentUser) && (
        <CompanyInfoDialog
          open={showCompanyInfoPopup}
          organization={currentUser.data}
        />
      )}
    </>
  );
}
