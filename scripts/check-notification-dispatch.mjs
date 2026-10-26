#!/usr/bin/env node
/**
 * Notification-dispatch ratchet — инвариант №2 программы уведомлений (BL-10).
 *
 * Все пуши/письма/in-app цепочек идут через NotificationDispatcherService
 * (apps/api/src/modules/notifications). Скрипт падает, если вне модуля
 * notifications появляется:
 *   - импорт/require `expo-server-sdk` (прямой push);
 *   - `new Expo(` (инстанс SDK без импорта не соберётся, но ловим и его);
 *   - импорт канальных сендеров (`.../notifications/channels/...`).
 *
 * Существующие нарушения грандфазерятся через
 * `notification-dispatch-baseline.json` (сейчас пуст — нарушений нет),
 * скрипт блокирует только регрессии. Клон check-tenant-guard.mjs.
 *
 *   node scripts/check-notification-dispatch.mjs            # проверка (CI/release gate)
 *   node scripts/check-notification-dispatch.mjs --update   # обновить baseline
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(here, '..');
const SRC = join(REPO_ROOT, 'apps/api/src');
const BASELINE = join(here, 'notification-dispatch-baseline.json');

const PATTERNS = [
  { id: 'expo-server-sdk-import', re: /from\s+['"]expo-server-sdk['"]/ },
  { id: 'expo-server-sdk-require', re: /require\(\s*['"]expo-server-sdk['"]\s*\)/ },
  { id: 'new-expo', re: /\bnew\s+Expo\s*\(/ },
  { id: 'channel-sender-import', re: /from\s+['"][^'"]*notifications\/channels\/[^'"]*['"]/ },
];

// Сам модуль notifications — единственное законное место каналов.
const EXCLUDE = [/\/modules\/notifications\//];

function collect() {
  const sigs = new Set();
  const entries = readdirSync(SRC, { recursive: true });
  for (const entry of entries) {
    const abs = join(SRC, entry.toString());
    if (!abs.endsWith('.ts')) continue;
    const posix = abs.replace(/\\/g, '/');
    if (EXCLUDE.some((re) => re.test(posix))) continue;
    let content;
    try {
      content = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const rel = relative(REPO_ROOT, abs).replace(/\\/g, '/');
    for (const line of content.split('\n')) {
      for (const pattern of PATTERNS) {
        if (pattern.re.test(line)) {
          sigs.add(`${rel}::${pattern.id}`);
        }
      }
    }
  }
  return [...sigs].sort();
}

const current = collect();

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(
    `notification-dispatch: baseline updated with ${current.length} entries.`,
  );
  process.exit(0);
}

const baseline = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, 'utf8'))
  : [];
const baseSet = new Set(baseline);
const currentSet = new Set(current);
const added = current.filter((s) => !baseSet.has(s));
const removed = baseline.filter((s) => !currentSet.has(s));

if (added.length > 0) {
  console.error(
    `❌ notification-dispatch: ${added.length} прямых вызовов push/каналов вне modules/notifications:`,
  );
  for (const s of added) console.error(`   + ${s}`);
  console.error(
    '\nВсе пуши/письма/in-app цепочек — через NotificationDispatcherService ' +
      '(apps/api/src/modules/notifications), инвариант №2.',
  );
  console.error(
    'Если это осознанно (не должно быть) — обновите baseline:\n' +
      '  node scripts/check-notification-dispatch.mjs --update',
  );
  process.exit(1);
}

console.log(
  `✅ notification-dispatch: no new violations ` +
    `(${current.length} grandfathered, ${removed.length} since removed).`,
);
process.exit(0);
