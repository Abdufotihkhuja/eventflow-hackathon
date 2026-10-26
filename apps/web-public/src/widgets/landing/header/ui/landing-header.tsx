"use client";

import { useState, useEffect, useRef } from "react";

import Image from "next/image";
import { LocalizedLink as Link } from "@shared/ui/localized-link";
import { usePathname } from "next/navigation";

import type { Locale } from "@eventflow/i18n";
import { useLocale, useT } from "@eventflow/i18n/react";
import {
  ArrowUpRight,
  Award,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Compass,
  Grid3X3,
  Heart,
  HelpCircle,
  Info,
  Layers,
  LogOut,
  Menu,
  Mic2,
  Newspaper,
  Settings,
  Tag,
  Ticket,
  User,
  Users,
} from "lucide-react";

import {
  useCurrentUserQuery,
  useLogoutMutation,
  useMyOrganizationsQuery,
  useScrollPosition,
} from "@shared/lib/hooks";
import { organizerAppUrl, workspaceEntryUrl } from "@shared/config";
import { stripLocalePrefix, withLocalePath } from "@shared/lib/i18n-routing";
import { isAuthenticated as hasAuthSession } from "@shared/lib/apiClient";
import { cn, getUserDisplayName, resolveAvatarUrl } from "@shared/lib/utils";
import { buttonStyles, Button } from "@shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@shared/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@shared/ui/sheet";

import { LanguageSwitcher } from "./language-switcher";

import type { UseScrollPositionReturn } from "@shared/lib";

/** Основные пункты навигации */
const mainNavItems = [
  { id: "home", labelKey: "public.navigation.home", href: "/" },
] as const;

/**
 * Soft surfacing of the (dark-launched) /pricing page — rendered at the END of
 * the nav, after the dropdowns. The SEO gate (NEXT_PUBLIC_PRICING_LIVE: noindex
 * / sitemap / footer link) and the /organizers section are left untouched.
 */
const pricingNavItem = {
  id: "pricing",
  labelKey: "pricing.nav.label",
  href: "/pricing",
} as const;

type Lang = "en" | "ru" | "uz";
interface LangBag {
  en: string;
  ru: string;
  uz?: string;
}

interface NavItemPreview {
  /** Editorial headline shown in the right preview card. */
  title: LangBag;
  /** Body — 1–2 sentences, evocative not redundant. */
  body: LangBag;
  /** Optional small stat / pill below body (uppercase, JBMono). */
  meta?: LangBag;
}

interface NavItemDef {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  descriptionKey: string;
  preview: NavItemPreview;
}

/** Dropdown меню "События" */
const eventsMenuItems: readonly NavItemDef[] = [
  {
    id: "all-events",
    labelKey: "public.navigation.allEvents",
    href: "/events",
    icon: Compass,
    descriptionKey: "public.navigation.catalogDescription",
    preview: {
      title: {
        en: "All upcoming events",
        ru: "Все ближайшие события",
        uz: "Barcha yaqin tadbirlar",
      },
      body: {
        en: "Browse conferences, workshops and meetups across Uzbekistan. Filter by date, city or topic and register in a couple of clicks.",
        ru: "Конференции, воркшопы и встречи по всему Узбекистану. Фильтруйте по дате, городу и теме и регистрируйтесь в пару кликов.",
        uz: "Oʻzbekiston boʻylab konferensiya, vorkshop va uchrashuvlar. Sana, shahar yoki mavzu boʻyicha saralang va bir necha bosishda roʻyxatdan oʻting.",
      },
    },
  },
  {
    id: "collections",
    labelKey: "public.navigation.collections",
    href: "/events?tab=collections",
    icon: Layers,
    descriptionKey: "public.navigation.collectionsDescription",
    preview: {
      title: {
        en: "Ready-made selections",
        ru: "Готовые подборки",
        uz: "Tayyor toʻplamlar",
      },
      body: {
        en: "Events grouped by what you're looking for — free entry, conferences, workshops and more.",
        ru: "События, сгруппированные по запросу — бесплатный вход, конференции, воркшопы и другое.",
        uz: "Soʻrovingiz boʻyicha guruhlangan tadbirlar — bepul kirish, konferensiyalar, vorkshoplar va boshqalar.",
      },
    },
  },
  {
    id: "categories",
    labelKey: "public.navigation.categories",
    href: "/events?tab=categories",
    icon: Grid3X3,
    descriptionKey: "public.navigation.categoriesDescription",
    preview: {
      title: {
        en: "Browse by topic",
        ru: "По темам",
        uz: "Mavzu boʻyicha",
      },
      body: {
        en: "Business training, conferences, hackathons, forums — pick a topic and see every event in it.",
        ru: "Бизнес-тренинги, конференции, хакатоны, форумы — выберите тему и смотрите все события в ней.",
        uz: "Biznes-treninglar, konferensiyalar, xakatonlar, forumlar — mavzuni tanlang va undagi barcha tadbirlarni koʻring.",
      },
    },
  },
  {
    id: "past",
    labelKey: "public.navigation.past",
    href: "/events/past",
    icon: Clock,
    descriptionKey: "public.navigation.pastDescription",
    preview: {
      title: {
        en: "Past events",
        ru: "Прошедшие события",
        uz: "Oʻtgan tadbirlar",
      },
      body: {
        en: "Events that have already finished, with their photos and materials. Handy for catching up on what you missed.",
        ru: "Уже завершённые события с фотографиями и материалами. Удобно, чтобы посмотреть, что вы пропустили.",
        uz: "Allaqachon tugagan tadbirlar — fotosurat va materiallari bilan. Oʻtkazib yuborganingizni koʻrish uchun qulay.",
      },
    },
  },
];

/** Dropdown меню "Ещё" */
const moreMenuItems: readonly NavItemDef[] = [
  {
    id: "blog",
    labelKey: "public.navigation.blog",
    href: "/blog",
    icon: Newspaper,
    descriptionKey: "public.navigation.blogDescription",
    preview: {
      title: {
        en: "Guides for organizers",
        ru: "Гайды для организаторов",
        uz: "Tashkilotchilar uchun qoʻllanmalar",
      },
      body: {
        en: "Practical articles on planning events, selling tickets and growing your audience — from the Eventflow team.",
        ru: "Практические статьи о том, как готовить события, продавать билеты и набирать аудиторию — от команды Eventflow.",
        uz: "Tadbir tayyorlash, chipta sotish va auditoriya yigʻish boʻyicha amaliy maqolalar — Eventflow jamoasidan.",
      },
    },
  },
  {
    id: "about",
    labelKey: "public.navigation.about",
    href: "/about",
    icon: Info,
    descriptionKey: "public.navigation.aboutDescription",
    preview: {
      title: {
        en: "About Eventflow",
        ru: "О Eventflow",
        uz: "Eventflow haqida",
      },
      body: {
        en: "An event platform built for Uzbekistan: payments in soʻm via Payme and Click, Russian and Uzbek, support from Tashkent.",
        ru: "Платформа для событий, созданная для Узбекистана: оплата в сумах через Payme и Click, русский и узбекский, поддержка из Ташкента.",
        uz: "Oʻzbekiston uchun yaratilgan tadbir platformasi: Payme va Click orqali soʻmda toʻlov, rus va oʻzbek tili, Toshkentdan qoʻllab-quvvatlash.",
      },
    },
  },
  {
    id: "organizers-directory",
    labelKey: "public.navigation.organizersDirectory",
    href: "/organizers/all",
    icon: Users,
    descriptionKey: "public.navigation.organizersDirectoryDescription",
    preview: {
      title: {
        en: "Organizer directory",
        ru: "Каталог организаторов",
        uz: "Tashkilotchilar katalogi",
      },
      body: {
        en: "All companies and teams running events on Eventflow — sorted by upcoming events, with links to their profiles.",
        ru: "Все компании и команды, делающие события на Eventflow — отсортированы по числу предстоящих, ссылки на профили.",
        uz: "Eventflow’da tadbir oʻtkazadigan barcha kompaniyalar va jamoalar — yaqin tadbirlar boʻyicha tartiblangan, profillarga havolalar.",
      },
    },
  },
  {
    id: "faq",
    labelKey: "public.navigation.faq",
    href: "/faq",
    icon: HelpCircle,
    descriptionKey: "public.navigation.faqDescription",
    preview: {
      title: {
        en: "Help & FAQ",
        ru: "Помощь и частые вопросы",
        uz: "Yordam va savollar",
      },
      body: {
        en: "Short answers about registration, payments, QR tickets, certificates, and how to reach support.",
        ru: "Короткие ответы о регистрации, оплате, QR-билетах, сертификатах и связи с поддержкой.",
        uz: "Roʻyxatdan oʻtish, toʻlov, QR-chiptalar, sertifikatlar va qoʻllab-quvvatlash haqida qisqa javoblar.",
      },
    },
  },
];

const pickPreviewLang = (locale: Locale): Lang => {
  if (locale === "ru") return "ru";
  if (locale === "uz") return "uz";
  return "en";
};

const tBag = (lang: Lang, bag: LangBag): string =>
  (lang === "ru" ? bag.ru : lang === "uz" ? bag.uz : bag.en) ?? bag.en;

const profileMenuItems = [
  {
    id: "profile",
    labelKey: "public.navigation.profile",
    href: "/profile",
    icon: User,
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
    icon: Heart,
  },
  {
    id: "settings",
    labelKey: "public.navigation.settings",
    href: "/profile/settings",
    icon: Settings,
  },
] as const;

export function LandingHeader(): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const pathname = stripLocalePrefix(usePathname());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isAtTop } = useScrollPosition({
    threshold: 16,
  }) as UseScrollPositionReturn;

  // eslint-disable-next-line no-restricted-syntax -- необходим для hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const hasSession = isMounted && hasAuthSession();

  const { data: user, isLoading: isUserLoading } = useCurrentUserQuery({
    enabled: hasSession,
  });

  const logoutMutation = useLogoutMutation({
    redirectTo: "/",
  });

  const isLoading = !isMounted || (hasSession && isUserLoading);
  const isAuthenticated = isMounted && Boolean(user);

  const handleLogout = (): void => {
    logoutMutation.mutate();
  };

  const handleDropdownEnter = (id: string): void => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setActiveDropdown(id);
  };

  const handleDropdownLeave = (): void => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const headerClassName = cn(
    "header-layer sticky top-0 w-full transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
    isAtTop
      ? "bg-bone-100/0 border-b border-transparent"
      : [
          "bg-bone-100/80 backdrop-blur-[20px] backdrop-saturate-[180%]",
          "border-b border-[var(--border-1)]",
        ]
  );

  const isEventsActive = pathname?.startsWith("/events");
  const isMoreActive =
    pathname?.startsWith("/blog") ||
    pathname?.startsWith("/about");
  const homePath = withLocalePath("/", locale);
  const highlightedEventsPath = withLocalePath("/events", locale);

  return (
    <header className={headerClassName}>
      <div className="container-wide flex items-center justify-between gap-3 py-3.5 lg:gap-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href={homePath}
            className="shrink-0"
            aria-label={t("public.shared.logoAlt")}
          >
            <Image
              src="/assets/logo.svg"
              alt={t("public.shared.logoAlt")}
              width={140}
              height={38}
              className="h-8 w-auto"
              style={{ width: "auto" }}
              priority
            />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {mainNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]/40 focus-visible:ring-offset-2",
                    active
                      ? "bg-bone-200/70 text-ink-400"
                      : "text-[var(--fg-2)] hover:bg-bone-200/40 hover:text-[var(--ink-400)]",
                  )}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}

            <NavDropdown
              id="events"
              label={t("public.navigation.events")}
              items={eventsMenuItems}
              isActive={isEventsActive ?? false}
              activeDropdown={activeDropdown}
              onEnter={handleDropdownEnter}
              onLeave={handleDropdownLeave}
              pathname={pathname}
              highlight={{
                title: t("public.navigation.findEventTitle"),
                description: t("public.navigation.findEventDescription"),
                icon: Mic2,
                href: highlightedEventsPath,
              }}
            />

            <NavDropdown
              id="more"
              label={t("public.navigation.more")}
              items={moreMenuItems}
              isActive={isMoreActive ?? false}
              activeDropdown={activeDropdown}
              onEnter={handleDropdownEnter}
              onLeave={handleDropdownLeave}
              pathname={pathname}
            />

            <Link
              href={pricingNavItem.href}
              aria-current={
                pathname === pricingNavItem.href ? "page" : undefined
              }
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]/40 focus-visible:ring-offset-2",
                pathname === pricingNavItem.href
                  ? "bg-bone-200/70 text-ink-400"
                  : "text-[var(--fg-2)] hover:bg-bone-200/40 hover:text-[var(--ink-400)]"
              )}
            >
              {t(pricingNavItem.labelKey)}
            </Link>
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />

          <LandingHeaderAuth
            pathname={pathname}
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            user={user ?? null}
            onLogout={handleLogout}
            isLoggingOut={logoutMutation.isPending}
          />

          {/* Mobile Sheet Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-2 hover:bg-bone-200 lg:hidden"
                aria-label={t("public.navigation.openMenu")}
              >
                <Menu className="size-5" aria-hidden />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
              <MobileSheetMenu
                pathname={pathname}
                isAuthenticated={isAuthenticated}
                user={user ?? null}
                onClose={() => setIsMobileMenuOpen(false)}
                onLogout={handleLogout}
                isLoggingOut={logoutMutation.isPending}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

/** Компонент dropdown навигации */
interface NavDropdownProps {
  id: string;
  label: string;
  items: readonly NavItemDef[];
  isActive: boolean;
  activeDropdown: string | null;
  onEnter: (id: string) => void;
  onLeave: () => void;
  pathname: string | null;
  /** Default preview shown when no nav item is being hovered. */
  highlight?: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    meta?: string;
  };
}

function NavDropdown({
  id,
  label,
  items,
  isActive,
  activeDropdown,
  onEnter,
  onLeave,
  pathname,
  highlight,
}: NavDropdownProps): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const previewLang = pickPreviewLang(locale);
  const isOpen = activeDropdown === id;
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Reset hover when the dropdown closes so the next open starts clean.
  // eslint-disable-next-line no-restricted-syntax -- локальный UI state-reset для NavDropdown
  useEffect(() => {
    if (!isOpen) setHoveredItemId(null);
  }, [isOpen]);

  const hoveredItem = hoveredItemId
    ? items.find((it) => it.id === hoveredItemId) ?? null
    : null;

  const previewIcon = hoveredItem?.icon ?? highlight?.icon;
  const previewTitle = hoveredItem
    ? tBag(previewLang, hoveredItem.preview.title)
    : highlight?.title;
  const previewBody = hoveredItem
    ? tBag(previewLang, hoveredItem.preview.body)
    : highlight?.description;
  const previewMeta = hoveredItem
    ? hoveredItem.preview.meta
      ? tBag(previewLang, hoveredItem.preview.meta)
      : undefined
    : highlight?.meta;
  const previewHref = hoveredItem?.href ?? highlight?.href ?? "/";

  return (
    <div
      className="relative"
      onMouseEnter={() => onEnter(id)}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onLeave() : onEnter(id))}
        className={cn(
          "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]/40 focus-visible:ring-offset-2",
          isActive || isOpen
            ? "bg-bone-200/70 text-ink-400"
            : "text-[var(--fg-2)] hover:bg-bone-200/40 hover:text-[var(--ink-400)]",
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "size-3.5 -mr-0.5 text-ink-50 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute left-0 top-full header-dropdown-panel pt-2",
            highlight ? "w-[620px]" : "w-[300px]"
          )}
        >
          <div className="overflow-hidden rounded-lg border border-[var(--border-1)] bg-white shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
            <div
              className={cn(
                "flex",
                highlight
                  ? "divide-x divide-[var(--border-1)] [&>nav]:basis-[60%] [&>nav]:shrink-0"
                  : ""
              )}
            >
              {/* Links */}
              <nav
                className="min-w-0 flex-1 p-2"
                onMouseLeave={() => setHoveredItemId(null)}
              >
                {items.map((item) => {
                  const isItemActive =
                    pathname === item.href ||
                    (item.href !== "/events" &&
                      !item.href.includes("?") &&
                      pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onFocus={() => setHoveredItemId(item.id)}
                      className={cn(
                        "group relative flex items-start gap-3 rounded-md px-3 py-3",
                        "transition-[background-color,color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                        isItemActive
                          ? "bg-ember-50"
                          : "hover:bg-bone-100"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md",
                          "transition-[background-color,color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                          isItemActive
                            ? "bg-ember-100 text-ember-500"
                            : "bg-bone-200 text-ink-100 group-hover:bg-ember-50 group-hover:text-ember-500"
                        )}
                      >
                        <item.icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            "text-sm font-semibold transition-colors duration-200",
                            isItemActive
                              ? "text-ember-500"
                              : "text-ink-300 group-hover:text-ink-400"
                          )}
                        >
                          {t(item.labelKey)}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 text-xs transition-colors duration-200",
                            isItemActive
                              ? "text-ember-500/70"
                              : "text-ink-100 group-hover:text-ink-200"
                          )}
                        >
                          {t(item.descriptionKey)}
                        </div>
                      </div>
                      <span
                        aria-hidden
                        className={cn(
                          "ml-auto self-center text-[15px] font-semibold leading-none",
                          "transition-[opacity,transform,color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                          isItemActive
                            ? "translate-x-0 text-ember-500 opacity-100"
                            : "-translate-x-1 text-ember-500 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                        )}
                      >
                        →
                      </span>
                    </Link>
                  );
                })}
              </nav>

              {/* Highlight / preview card — reflects the currently-hovered nav item.
                  Height is locked to the nav column so the panel never shifts. */}
              {highlight && previewIcon && previewTitle && (
                <div className="flex-1 basis-[40%] min-w-0 p-2">
                  <Link
                    href={previewHref}
                    className={cn(
                      "group relative flex h-full flex-col rounded-md bg-ember-50 px-5 py-6 text-left",
                      "transition-[background-color,box-shadow] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                      "hover:bg-ember-100 hover:shadow-[var(--shadow-glow-warm)]",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ember-400/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    )}
                  >
                    <div
                      key={previewTitle}
                      className="flex flex-1 flex-col animate-in fade-in duration-200"
                    >
                      <div
                        className={cn(
                          "mb-4 flex size-11 items-center justify-center rounded-md bg-ember-400",
                          "transition-[background-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                          "group-hover:bg-ember-500"
                        )}
                      >
                        {(() => {
                          const Icon = previewIcon;
                          return (
                            <Icon className="size-5 text-white" aria-hidden />
                          );
                        })()}
                      </div>
                      <div
                        className="text-sm font-bold text-ink-400 leading-tight line-clamp-2"
                        style={{
                          letterSpacing: "var(--track-snug)",
                          textWrap: "balance",
                        }}
                      >
                        {previewTitle}
                      </div>
                      <p
                        className="mt-1.5 text-[12.5px] text-ink-200 m-0 line-clamp-3"
                        style={{
                          lineHeight: 1.5,
                          textWrap: "pretty",
                        }}
                      >
                        {previewBody}
                      </p>
                      <div className="mt-auto pt-3 flex items-center gap-2">
                        {previewMeta && (
                          <span
                            className="inline-block text-[10px] font-medium uppercase text-ink-100 line-clamp-1"
                            style={{
                              fontFamily: "var(--font-mono)",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {previewMeta}
                          </span>
                        )}
                        <svg
                          aria-hidden
                          width="36"
                          height="10"
                          viewBox="0 0 36 10"
                          fill="none"
                          className={cn(
                            "ml-auto text-ember-500",
                            "transition-[opacity,transform] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
                            "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                          )}
                        >
                          <path
                            d="M0 5 H34 M30 1 L34 5 L30 9"
                            stroke="currentColor"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LandingHeaderAuth({
  pathname,
  isLoading,
  isAuthenticated,
  user,
  onLogout,
  isLoggingOut,
}: {
  pathname: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: {
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const loginPath = withLocalePath("/login", locale);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 animate-pulse rounded-full bg-bone-300" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Link
          href={loginPath}
          className="inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium text-[var(--ink-300)] transition-colors hover:bg-bone-200/60 hover:text-[var(--ink-400)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]/40 focus-visible:ring-offset-2"
        >
          {t("public.navigation.login")}
        </Link>
        <Link
          href={organizerAppUrl}
          className="hidden h-10 shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--ember-400)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-xs)] transition-colors hover:bg-[var(--ember-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ember-400)]/40 focus-visible:ring-offset-2 xl:inline-flex"
        >
          {t("public.navigation.createEvent")}
        </Link>
      </>
    );
  }

  return (
    <LandingProfileMenu
      pathname={pathname}
      user={user}
      onLogout={onLogout}
      isLoggingOut={isLoggingOut}
    />
  );
}

/**
 * Организации аккаунта в меню профиля. Человек может быть одновременно
 * участником событий и сотрудником организации — отсюда он попадает в рабочее
 * пространство, не вспоминая адрес и не проходя вход заново. Пока организаций
 * нет, секции нет.
 */
function AccountOrganizations({ email }: { email: string }): React.ReactNode {
  const t = useT();
  const { data: organizations } = useMyOrganizationsQuery();

  if (!organizations || organizations.length === 0) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <div className="p-2">
        <p className="px-2 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-100">
          {t("public.navigation.organizationsSection")}
        </p>
        {organizations.map((organization) => (
          <DropdownMenuItem key={organization.organizationId} asChild>
            <a
              href={workspaceEntryUrl(email)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-100 hover:bg-bone-100 hover:text-ink-400"
            >
              <Building2 className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {organization.name}
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-ink-50" aria-hidden />
            </a>
          </DropdownMenuItem>
        ))}
        <p className="px-2 pt-1 text-[11px] text-ink-100">
          {t("public.navigation.organizationsHint")}
        </p>
      </div>
    </>
  );
}

function LandingProfileMenu({
  pathname,
  user,
  onLogout,
  isLoggingOut,
}: {
  pathname: string | null;
  user: {
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  };
  onLogout: () => void;
  isLoggingOut: boolean;
}): React.ReactNode {
  const t = useT();
  const displayName = getUserDisplayName(user);
  const avatar = resolveAvatarUrl(user.avatarUrl);
  const firstName =
    user?.firstName?.trim() ??
    displayName.trim().split(/\s+/)[0] ??
    displayName;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-pill border border-[var(--border-1)] bg-white py-1 pl-1 pr-3 transition-[background-color,border-color] duration-200 ease-[var(--ease-standard,cubic-bezier(0.2,0,0,1))]",
            "hover:border-ember-200 hover:bg-ember-50",
            "data-[state=open]:border-ember-300 data-[state=open]:bg-ember-50"
          )}
        >
          {avatar ? (
            <Image
              src={avatar}
              alt={displayName}
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-ember-400">
              <User className="size-4 text-white" aria-hidden />
            </div>
          )}
          <span className="hidden text-sm font-medium text-ink-200 sm:block">
            {firstName}
          </span>
          <ChevronDown
            className="size-4 text-ink-50 transition-transform data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="border-b border-bone-200 px-4 py-4">
          <div className="flex items-center gap-3">
            {avatar ? (
              <Image
                src={avatar}
                alt={displayName}
                width={48}
                height={48}
                className="size-12 rounded-xl object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-xl bg-ember-400">
                <User className="size-6 text-white" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-400">
                {displayName}
              </p>
              <p className="truncate text-xs text-ink-100">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="p-2">
          {profileMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/profile" && pathname?.startsWith(item.href));

            return (
              <DropdownMenuItem key={item.id} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    isActive
                      ? "bg-ember-50 text-ember-500"
                      : "text-ink-100 hover:bg-bone-100 hover:text-ink-400"
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {t(item.labelKey)}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
        <AccountOrganizations email={user.email} />
        <DropdownMenuSeparator />
        <div className="p-2">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              onLogout();
            }}
            disabled={isLoggingOut}
            className="w-full cursor-pointer text-[var(--danger)] focus:bg-[var(--danger-soft)] focus:text-[var(--danger)]"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            {isLoggingOut
              ? t("public.navigation.loggingOut")
              : t("public.navigation.logout")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileSheetMenu({
  pathname,
  isAuthenticated,
  user,
  onClose,
  onLogout,
  isLoggingOut,
}: {
  pathname: string | null;
  isAuthenticated: boolean;
  user: {
    name?: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
  onClose: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}): React.ReactNode {
  const t = useT();
  const locale = useLocale();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sheetContainer, setSheetContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const homePath = withLocalePath("/", locale);
  const profilePath = withLocalePath("/profile", locale);
  const loginPath = withLocalePath("/login", locale);
  const avatar = resolveAvatarUrl(user?.avatarUrl);

  const toggleSection = (section: string): void => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  return (
    <div ref={setSheetContainer} className="flex h-full flex-col">
      <SheetHeader className="border-b border-bone-200 p-4">
        <div className="flex items-center justify-between">
          <Link href={homePath} onClick={onClose} className="shrink-0">
            <Image
              src="/assets/logo.svg"
              alt={t("public.shared.logoAlt")}
              width={120}
              height={32}
              className="h-7 w-auto"
              style={{ width: "auto" }}
            />
          </Link>
          <SheetTitle className="sr-only">
            {t("public.navigation.navigationMenu")}
          </SheetTitle>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* User card */}
        {isAuthenticated && user && (
          <div className="border-b border-bone-200 p-4">
            <Link
              href={profilePath}
              onClick={onClose}
              className="flex items-center gap-3 rounded-lg bg-bone-200 p-3 transition-colors active:bg-bone-200"
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt={getUserDisplayName(user)}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div className="flex size-11 items-center justify-center rounded-full bg-ember-400 ring-2 ring-white">
                  <User className="size-5 text-white" aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-400">
                  {getUserDisplayName(user)}
                </p>
                <p className="truncate text-xs text-ink-100">
                  {user.email}
                </p>
              </div>
              <ChevronDown
                className="size-4 -rotate-90 text-ink-50"
                aria-hidden
              />
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-0.5 p-3">
          {mainNavItems.map((item) => (
            <SheetClose key={item.id} asChild>
              <Link
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-ember-50 text-ember-500"
                    : "text-ink-200 active:bg-bone-200"
                )}
              >
                <Compass className="size-4 shrink-0" aria-hidden />
                {t(item.labelKey)}
              </Link>
            </SheetClose>
          ))}

          <MobileSheetAccordion
            title={t("public.navigation.events")}
            icon={<Ticket className="size-4 shrink-0" aria-hidden />}
            isExpanded={expandedSection === "events"}
            onToggle={() => toggleSection("events")}
            isActive={pathname?.startsWith("/events") ?? false}
          >
            {eventsMenuItems.map((item) => (
              <SheetClose key={item.id} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                    pathname === item.href ||
                      (item.href !== "/events" &&
                        !item.href.includes("?") &&
                        pathname?.startsWith(item.href))
                      ? "bg-ember-50 text-ember-500"
                      : "text-ink-100 active:bg-bone-100"
                  )}
                >
                  <item.icon
                    className="size-4 shrink-0 text-ink-50"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{t(item.labelKey)}</div>
                    <div className="truncate text-xs text-ink-50">
                      {t(item.descriptionKey)}
                    </div>
                  </div>
                </Link>
              </SheetClose>
            ))}
          </MobileSheetAccordion>

          <MobileSheetAccordion
            title={t("public.navigation.more")}
            icon={<Grid3X3 className="size-4 shrink-0" aria-hidden />}
            isExpanded={expandedSection === "more"}
            onToggle={() => toggleSection("more")}
            isActive={
              (pathname?.startsWith("/blog") ||
                pathname?.startsWith("/about")) ??
              false
            }
          >
            {moreMenuItems.map((item) => (
              <SheetClose key={item.id} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors",
                    pathname?.startsWith(item.href)
                      ? "bg-ember-50 text-ember-500"
                      : "text-ink-100 active:bg-bone-100"
                  )}
                >
                  <item.icon
                    className="size-4 shrink-0 text-ink-50"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="font-medium">{t(item.labelKey)}</div>
                    <div className="truncate text-xs text-ink-50">
                      {t(item.descriptionKey)}
                    </div>
                  </div>
                </Link>
              </SheetClose>
            ))}
          </MobileSheetAccordion>

          <SheetClose asChild>
            <Link
              href={pricingNavItem.href}
              aria-current={
                pathname === pricingNavItem.href ? "page" : undefined
              }
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                pathname === pricingNavItem.href
                  ? "bg-ember-50 text-ember-500"
                  : "text-ink-200 active:bg-bone-200"
              )}
            >
              <Tag className="size-4 shrink-0" aria-hidden />
              {t(pricingNavItem.labelKey)}
            </Link>
          </SheetClose>

          {/* Profile quick links */}
          {isAuthenticated && user && (
            <>
              <div className="my-2 border-t border-bone-200" />
              <p className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-ink-50">
                {t("public.navigation.profileSection")}
              </p>
              {profileMenuItems.map((item) => (
                <SheetClose key={item.id} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                      pathname === item.href ||
                        (item.href !== "/profile" &&
                          pathname?.startsWith(item.href))
                        ? "bg-ember-50 text-ember-500"
                        : "text-ink-100 active:bg-bone-100"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    {t(item.labelKey)}
                  </Link>
                </SheetClose>
              ))}
            </>
          )}
        </nav>
      </div>

      <SheetFooter className="mt-auto border-t border-bone-200 p-4">
        <LanguageSwitcher
          fullWidth
          align="start"
          portalContainer={sheetContainer}
        />
        {!isAuthenticated ? (
          <div className="flex w-full flex-col gap-2.5">
            <SheetClose asChild>
              <Link href={organizerAppUrl}>
                <Button variant="primary" size="lg" className="w-full">
                  {t("public.navigation.createEvent")}
                </Button>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href={loginPath}>
                <Button variant="outline" size="lg" className="w-full">
                  {t("public.navigation.login")}
                </Button>
              </Link>
            </SheetClose>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            disabled={isLoggingOut}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] transition-colors active:opacity-90"
          >
            <LogOut className="size-4" aria-hidden />
            {isLoggingOut
              ? t("public.navigation.loggingOut")
              : t("public.navigation.logoutAccount")}
          </button>
        )}
      </SheetFooter>
    </div>
  );
}

function MobileSheetAccordion({
  title,
  icon,
  isExpanded,
  onToggle,
  isActive,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  isActive: boolean;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
          isActive ? "text-ember-500" : "text-ink-200 active:bg-bone-200"
        )}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown
          className={cn(
            "size-4 text-ink-50 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <div
        className={cn(
          "ml-4 space-y-0.5 overflow-hidden border-l-2 border-bone-200 pl-2 transition-all duration-200",
          isExpanded ? "max-h-[500px] py-1 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
