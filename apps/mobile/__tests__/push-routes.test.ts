/**
 * BL-15: парсер payload пуша → навигация.
 *
 * Две группы инвариантов:
 *   1) `resolvePushTarget` — валидный маршрут, незнакомый маршрут, чужой шелл,
 *      недозаполненные параметры, мусорный payload;
 *   2) таблица KNOWN_PUSH_ROUTES сверяется с ФАКТИЧЕСКИМИ файлами `app/**`
 *      (Invariant №6 из MOBILE_IMPACT §7): маршрут в параметрической нотации
 *      обязан существовать как файл Expo Router — иначе пуш ведёт в 404.
 */
import * as fs from "fs";
import * as path from "path";

import {
  KNOWN_PUSH_ROUTES,
  ORG_FALLBACK_ROUTE,
  PARTICIPANT_FALLBACK_ROUTE,
} from "@shared/notifications/known-routes";
import { resolvePushChannel, resolvePushTarget } from "@shared/notifications/resolve-target";

describe("resolvePushTarget", () => {
  it("резолвит валидный участнический маршрут с параметрами", () => {
    const target = resolvePushTarget(
      { route: "/ticket/[id]", params: { id: "reg-42" } },
      { shell: "participant" },
    );
    expect(target).toEqual({
      pathname: "/ticket/[id]",
      params: { id: "reg-42" },
      requiresPersonalSession: false,
    });
  });

  it("резолвит валидный организаторский маршрут", () => {
    const target = resolvePushTarget(
      { route: "/org/attendees/[eventId]", params: { eventId: "ev-7" } },
      { shell: "org" },
    );
    expect(target.pathname).toBe("/org/attendees/[eventId]");
    expect(target.params).toEqual({ eventId: "ev-7" });
    expect(target.requiresPersonalSession).toBe(false);
  });

  it("незнакомый маршрут падает на фолбэк шелла, который называет его префикс", () => {
    const org = resolvePushTarget(
      { route: "/org/payouts/[id]", params: { id: "x" } },
      { shell: "org" },
    );
    expect(org.pathname).toBe(ORG_FALLBACK_ROUTE);

    const participant = resolvePushTarget(
      { route: "/checkout/[orderId]", params: { orderId: "o-1" } },
      { shell: "participant" },
    );
    expect(participant.pathname).toBe(PARTICIPANT_FALLBACK_ROUTE);
  });

  it("чужой шелл: участнический маршрут при org-сессии требует выхода из workspace", () => {
    const target = resolvePushTarget(
      { route: "/ticket/[id]", params: { id: "reg-42" } },
      { shell: "org" },
    );
    expect(target.pathname).toBe("/ticket/[id]");
    expect(target.requiresPersonalSession).toBe(true);
  });

  it("чужой шелл: org-маршрут при участнической сессии НЕ требует ничего — гейт разрулит", () => {
    const target = resolvePushTarget(
      { route: "/org/event/[id]", params: { id: "ev-7" } },
      { shell: "participant" },
    );
    expect(target.pathname).toBe("/org/event/[id]");
    expect(target.requiresPersonalSession).toBe(false);
  });

  it("маршрут без обязательного параметра неисполним — фолбэк его шелла", () => {
    const target = resolvePushTarget({ route: "/event/[id]", params: {} }, { shell: "participant" });
    expect(target.pathname).toBe(PARTICIPANT_FALLBACK_ROUTE);
    expect(target.params).toEqual({});
  });

  it("числовой параметр приводится к строке (expo-router ждёт строки)", () => {
    const target = resolvePushTarget(
      { route: "/event/[id]", params: { id: 123 } },
      { shell: "participant" },
    );
    expect(target.params).toEqual({ id: "123" });
  });

  it("мусорный payload остаётся в текущем шелле", () => {
    expect(resolvePushTarget(undefined, { shell: "participant" }).pathname).toBe(PARTICIPANT_FALLBACK_ROUTE);
    expect(resolvePushTarget({}, { shell: "org" }).pathname).toBe(ORG_FALLBACK_ROUTE);
    expect(resolvePushTarget({ route: 42 as unknown }, { shell: "org" }).pathname).toBe(ORG_FALLBACK_ROUTE);
  });
});

describe("resolvePushChannel", () => {
  it("узнаёт каналы контракта и считает всё прочее informational", () => {
    expect(resolvePushChannel({ channel: "transactional" })).toBe("transactional");
    expect(resolvePushChannel({ channel: "reminders" })).toBe("reminders");
    expect(resolvePushChannel({ channel: "marketing" })).toBe("updates");
    expect(resolvePushChannel(undefined)).toBe("updates");
  });
});

describe("таблица маршрутов ↔ файлы app/**", () => {
  /** Все маршруты, которые реально существуют в Expo Router: файлы `app/**`
   *  минус layouts, route-группы `(…)` схлопнуты, `index` — это родитель. */
  function collectRoutes(): Set<string> {
    const appDir = path.join(__dirname, "..", "app");
    const routes = new Set<string>();
    const walk = (dir: string, segments: string[]): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), [...segments, entry.name]);
          continue;
        }
        if (!entry.name.endsWith(".tsx") || entry.name.startsWith("_")) continue;
        const base = entry.name.slice(0, -".tsx".length);
        const parts = [...segments, ...(base === "index" ? [] : [base])]
          // Route-группы `(tabs)` в URL не попадают.
          .filter((s) => !(s.startsWith("(") && s.endsWith(")")));
        routes.add(`/${parts.join("/")}`);
      }
    };
    walk(appDir, []);
    return routes;
  }

  const existing = collectRoutes();

  it.each(Object.keys(KNOWN_PUSH_ROUTES))("маршрут %s существует в app/**", (route) => {
    expect(existing.has(route)).toBe(true);
  });

  it("оба фолбэка существуют в app/**", () => {
    expect(existing.has(PARTICIPANT_FALLBACK_ROUTE)).toBe(true);
    expect(existing.has(ORG_FALLBACK_ROUTE)).toBe(true);
  });

  it("параметры таблицы совпадают с плейсхолдерами маршрута", () => {
    for (const [route, def] of Object.entries(KNOWN_PUSH_ROUTES)) {
      const placeholders = [...route.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
      expect([...def.params].sort()).toEqual(placeholders.sort());
    }
  });
});
