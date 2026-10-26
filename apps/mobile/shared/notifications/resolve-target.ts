/**
 * Парсер payload пуша → цель навигации (BL-15). Чистая функция без побочных
 * эффектов — её и покрывает `__tests__/push-routes.test.ts`.
 *
 * Контракт payload (`data` в Expo-пуше): `{ route, params, channel }` —
 * внутренний формат, НЕ URL (scheme `eventflow://` нужен только внешним
 * ссылкам). `route` записан в параметрической нотации Expo Router и обязан
 * быть в KNOWN_PUSH_ROUTES; всё незнакомое или недозаполненное падает на
 * фолбэк соответствующего шелла, а не в белый экран.
 */
import {
  KNOWN_PUSH_ROUTES,
  ORG_FALLBACK_ROUTE,
  PARTICIPANT_FALLBACK_ROUTE,
  type KnownPushRouteName,
  type PushShell,
} from "./known-routes";

/** Каналы Android / классы важности из контент-контракта каталога. */
export type PushChannel = "transactional" | "reminders" | "updates";

/** `data` входящего пуша — то, что кладёт сервер (BL-25/бэкенд-канал). */
export interface PushPayloadData {
  route?: unknown;
  params?: unknown;
  channel?: unknown;
}

export interface PushTarget {
  pathname: string;
  params: Record<string, string>;
  /**
   * Цель — участнический экран, а активная сессия org-scoped: перед навигацией
   * нужно `exitWorkspace()` (личные экраны с org-токеном получают 403).
   * Обратное направление флага не требует: org-маршруты сидят за
   * `useWorkspaceGate`, который сам держит restore и делает фолбэк.
   */
  requiresPersonalSession: boolean;
}

function fallbackFor(shell: PushShell): string {
  return shell === "org" ? ORG_FALLBACK_ROUTE : PARTICIPANT_FALLBACK_ROUTE;
}

function isKnownRoute(route: string): route is KnownPushRouteName {
  return Object.prototype.hasOwnProperty.call(KNOWN_PUSH_ROUTES, route);
}

/** Канал пуша из payload; всё неопознанное считаем informational (`updates`). */
export function resolvePushChannel(data: PushPayloadData | null | undefined): PushChannel {
  const channel = data?.channel;
  if (channel === "transactional" || channel === "reminders" || channel === "updates") return channel;
  return "updates";
}

/**
 * Разрешить payload в цель навигации.
 *
 * @param data  `notification.request.content.data` как пришло (не доверяем).
 * @param ctx.shell какой шелл активен СЕЙЧАС: есть workspace → "org".
 */
export function resolvePushTarget(
  data: PushPayloadData | null | undefined,
  ctx: { shell: PushShell },
): PushTarget {
  const route = typeof data?.route === "string" ? data.route : null;

  // Пуш вообще без маршрута — некуда вести, остаёмся в текущем шелле.
  if (!route) {
    return { pathname: fallbackFor(ctx.shell), params: {}, requiresPersonalSession: false };
  }

  // Шелл цели определяет префикс маршрута — даже для неизвестного route
  // организаторский пуш должен упасть в организаторский фолбэк, а не в ленту.
  const impliedShell: PushShell = route === "/org" || route.startsWith("/org/") ? "org" : "participant";

  const finish = (pathname: string, params: Record<string, string>, shell: PushShell): PushTarget => ({
    pathname,
    params,
    requiresPersonalSession: shell === "participant" && ctx.shell === "org",
  });

  if (!isKnownRoute(route)) {
    return finish(fallbackFor(impliedShell), {}, impliedShell);
  }

  const def = KNOWN_PUSH_ROUTES[route];
  const rawParams = (data?.params ?? {}) as Record<string, unknown>;
  const params: Record<string, string> = {};
  for (const name of def.params) {
    const value = rawParams?.[name];
    // Строки — как есть, числа приводим (expo-router ждёт строковые params).
    let str = "";
    if (typeof value === "string") str = value;
    else if (typeof value === "number") str = String(value);
    if (!str) {
      // Обязательный параметр не пришёл — маршрут неисполним, фолбэк шелла.
      return finish(fallbackFor(def.shell), {}, def.shell);
    }
    params[name] = str;
  }

  return finish(route, params, def.shell);
}
