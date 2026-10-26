import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATES } from '../mail/email/templates';
import {
  NOTIFICATION_CATALOG,
  PENDING_EMAIL_TEMPLATES,
  catalogPushKeys,
  getCatalogEntry,
  resolvePushImportance,
} from './catalog';
import { NOTIFICATION_CHANNELS } from './dispatch/notification.types';
import { PUSH_LOCALES } from './i18n/plural';
import { PUSH_MESSAGES, renderPushMessage } from './i18n/push-messages';

/**
 * CI-инварианты №5/№6 машинного каталога (BL-16).
 *
 * №5 — полнота локалей: каждый i18n-ключ каталога существует в словаре push.*
 * для ru/uz/en и рендерится непустыми title/body; отсутствие = fail.
 *
 * №6 — deep links: каждый route каталога существует в машинной таблице
 * маршрутов мобилки (apps/mobile/shared/notifications/known-routes.ts,
 * параметрическая нотация Expo Router), сравнение прямое, без нормализации.
 * Монорепо позволяет прямое чтение файла — снапшот не нужен и не может
 * протухнуть.
 */

/**
 * Allowlist маршрутов, ОБЕЩАННЫХ каталогом, но ещё не созданных в мобилке.
 * /checkout/[orderId] — экран оплаты (OQ-05/BL-49): до его появления
 * REG-02/03/05 ведут на /event/[id]. Создание экрана обязано убрать маршрут
 * отсюда и добавить его в каталог/known-routes.
 */
const PENDING_ROUTES: readonly string[] = ['/checkout/[orderId]'];

const KNOWN_ROUTES_PATH = join(
  __dirname,
  '../../../../..',
  'apps/mobile/shared/notifications/known-routes.ts',
);

function readMobileKnownRoutes(): Set<string> {
  const source = readFileSync(KNOWN_ROUTES_PATH, 'utf8');
  const routes = new Set<string>();
  // Ключи объекта KNOWN_PUSH_ROUTES: строки вида "/org/attendees/[eventId]": {
  const re = /^\s*"(\/[^"]*)":\s*\{/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    routes.add(match[1]);
  }
  return routes;
}

describe('машинный каталог уведомлений (BL-16)', () => {
  it('ID уникальны и каталог непуст', () => {
    const ids = NOTIFICATION_CATALOG.map((e) => e.id);
    expect(ids.length).toBeGreaterThan(20);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('getCatalogEntry резолвит записи по id', () => {
    expect(getCatalogEntry('REG-06')?.priority).toBe('high');
    expect(getCatalogEntry('NOPE-99')).toBeUndefined();
  });

  it('у каждой записи с каналом push есть pushKey; без push — нет', () => {
    for (const entry of NOTIFICATION_CATALOG) {
      const hasPush = entry.channels.includes(NOTIFICATION_CHANNELS.PUSH);
      if (hasPush) {
        expect(entry.pushKey).toBeDefined();
      } else {
        expect(entry.pushKey).toBeUndefined();
      }
    }
  });

  it('emailFallback объявлен только у записей с каналом push', () => {
    for (const entry of NOTIFICATION_CATALOG) {
      if (entry.emailFallback) {
        expect(entry.channels).toContain(NOTIFICATION_CHANNELS.PUSH);
      }
    }
  });

  it('REM-строки идут в Android-канал reminders, transactional — в transactional', () => {
    expect(resolvePushImportance(getCatalogEntry('REM-01')!)).toBe('reminders');
    expect(resolvePushImportance(getCatalogEntry('REG-06')!)).toBe(
      'transactional',
    );
    expect(resolvePushImportance(getCatalogEntry('CLS-01')!)).toBe('updates');
  });

  describe('инвариант №5 — полнота локалей ru/uz/en', () => {
    const allKeys = NOTIFICATION_CATALOG.flatMap((entry) =>
      catalogPushKeys(entry),
    );

    it('каталог даёт push-ключи', () => {
      expect(allKeys.length).toBeGreaterThan(20);
    });

    it.each(allKeys.map((key) => [key]))(
      '%s существует в словаре и рендерится непустым в ru/uz/en',
      (key) => {
        expect(PUSH_MESSAGES[key]).toBeDefined();
        for (const locale of PUSH_LOCALES) {
          expect(PUSH_MESSAGES[key][locale]).toBeDefined();
          const rendered = renderPushMessage(key, locale, {
            eventTitle: 'Test Event',
            startTime: '18:00',
            holdUntil: '18:15',
            newCount: 3,
            cancelledCount: 1,
            totalCount: 25,
            pendingCount: 2,
            seatsLeft: 3,
          });
          expect(rendered).not.toBeNull();
          expect(rendered!.title.trim()).not.toBe('');
          expect(rendered!.body.trim()).not.toBe('');
        }
      },
    );

    it('в словаре нет ключей-сирот, которых не знает каталог', () => {
      const catalogSet = new Set(allKeys);
      for (const key of Object.keys(PUSH_MESSAGES)) {
        expect(catalogSet.has(key)).toBe(true);
      }
    });
  });

  describe('инвариант №6 — deep links против known-routes мобилки', () => {
    const mobileRoutes = readMobileKnownRoutes();

    it('таблица known-routes прочитана (санити парсера)', () => {
      expect(mobileRoutes.size).toBeGreaterThanOrEqual(5);
      expect(mobileRoutes.has('/event/[id]')).toBe(true);
    });

    const allRoutes = NOTIFICATION_CATALOG.flatMap((entry) => [
      ...(entry.routes ?? []),
    ]);

    it.each([...new Set(allRoutes)].map((route) => [route]))(
      'route %s существует в apps/mobile/shared/notifications/known-routes.ts',
      (route) => {
        const known =
          mobileRoutes.has(route) || PENDING_ROUTES.includes(route);
        expect(known).toBe(true);
      },
    );

    it('PENDING_ROUTES не протух: маршруты из allowlist ещё НЕ созданы', () => {
      for (const route of PENDING_ROUTES) {
        expect(mobileRoutes.has(route)).toBe(false);
      }
    });
  });

  describe('инвариант №5 — email-шаблоны', () => {
    const templates = NOTIFICATION_CATALOG.flatMap((entry) =>
      entry.emailTemplate ? [entry.emailTemplate] : [],
    );

    it.each([...new Set(templates)].map((name) => [name]))(
      'шаблон %s существует в TEMPLATES либо ждёт BL-26 в PENDING_EMAIL_TEMPLATES',
      (name) => {
        const exists =
          Boolean(TEMPLATES[name]) || PENDING_EMAIL_TEMPLATES.includes(name);
        expect(exists).toBe(true);
      },
    );

    it('PENDING_EMAIL_TEMPLATES не протух: шаблоны из списка ещё НЕ созданы', () => {
      for (const name of PENDING_EMAIL_TEMPLATES) {
        expect(TEMPLATES[name]).toBeUndefined();
      }
    });
  });
});
