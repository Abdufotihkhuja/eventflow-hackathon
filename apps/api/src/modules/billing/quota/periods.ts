/**
 * Ленивые окна потребления (E-11a, CR-6): periodKey — ЕДИНСТВЕННЫЙ механизм
 * корректности сбросов. Планировщик (E-11b, BullMQ) занимается только
 * гигиеной (уведомления, GC, роллапы) и НИКОГДА не нужен, чтобы «сбросить»
 * счётчик: новое окно = новый periodKey = новая строка UsageCounter.
 *
 * Форматы ключей (D-7):
 *  - 'YYYY-MM'                — календарный месяц UTC (START-квоты);
 *  - 'pack:<purchaseId>'      — весь период пакета (генерации PRO/EXCLUSIVE);
 *  - 'pack:<purchaseId>:m<N>' — N-е месячное окно AI-минут внутри пакета,
 *    заякоренное на activatedAt (§2.1: три окна на 90-дневный пакет).
 */

/** Календарный месяц UTC: '2026-07'. */
export function calendarMonthKey(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Ключ на весь период пакета. */
export function packPeriodKey(purchaseId: string): string {
  return `pack:${purchaseId}`;
}

/**
 * addMonths по UTC с клампом дня (31 янв + 1 мес → 28/29 фев) — стандартная
 * якорная арифметика месячных окон.
 */
export function addMonthsUtc(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const target = new Date(
    Date.UTC(
      y,
      m + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
  const daysInTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, daysInTarget));
  return target;
}

/**
 * Индекс месячного окна внутри пакета: 0 для [activatedAt, +1 мес), 1 — далее…
 * Бросает, если now раньше активации (защита от рассинхронизированных часов).
 */
export function packMonthIndex(activatedAt: Date, now: Date): number {
  if (now < activatedAt) {
    throw new Error(
      `packMonthIndex: now (${now.toISOString()}) раньше активации (${activatedAt.toISOString()})`,
    );
  }
  let index = 0;
  // Пакеты живут ~90 дней (§2.1) — линейный проход из 3-4 шагов дешевле и
  // читабельнее календарной алгебры с граничными случаями.
  while (addMonthsUtc(activatedAt, index + 1) <= now) {
    index += 1;
  }
  return index;
}

/** Ключ месячного окна AI-минут внутри пакета. */
export function packMonthlyKey(
  purchaseId: string,
  activatedAt: Date,
  now: Date,
): string {
  return `pack:${purchaseId}:m${packMonthIndex(activatedAt, now)}`;
}
