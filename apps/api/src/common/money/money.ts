/**
 * Денежное представление платформы (монетизация, D-3).
 *
 * Конвенция для ВСЕХ новых денежных значений:
 *  - хранение: Prisma `BigInt` в минорных единицах (UZS → тийины, USD → центы),
 *    колонки называются `*AmountMinor` (для USD-якоря — `*Cents`);
 *  - провод (JSON): строка из цифр, никогда number — фронтенды форматируют
 *    через i18n и не парсят в float (см. bigint-json.ts);
 *  - существующие display-поля `Event.price` / `RentalPlace.pricePerHour`
 *    (Decimal 10,2, мажорные единицы) НЕ мигрируются — это витринные значения,
 *    деньги через них не проходят.
 */

const MINOR_AMOUNT_RE = /^(0|[1-9]\d*)$/;

/** Максимум, который принимаем на вход: 10^15 тийинов = 10 трлн UZS. */
export const MAX_MINOR_AMOUNT = 10n ** 15n;

export class InvalidMinorAmountError extends Error {
  constructor(value: unknown, reason: string) {
    super(`Некорректная денежная сумма "${String(value)}": ${reason}`);
    this.name = 'InvalidMinorAmountError';
  }
}

/**
 * Парсит строку/число/bigint в неотрицательный BigInt минорных единиц.
 * Строгий: никакой экспоненты, знаков, дробей, пробелов, ведущих нулей.
 */
export function parseMinorAmount(value: string | number | bigint): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new InvalidMinorAmountError(value, 'отрицательная');
    if (value > MAX_MINOR_AMOUNT)
      throw new InvalidMinorAmountError(value, 'превышает максимум');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new InvalidMinorAmountError(
        value,
        'ожидается неотрицательное целое (safe integer)',
      );
    return BigInt(value);
  }
  if (!MINOR_AMOUNT_RE.test(value))
    throw new InvalidMinorAmountError(
      value,
      'ожидается строка из цифр без знака/дробной части',
    );
  const parsed = BigInt(value);
  if (parsed > MAX_MINOR_AMOUNT)
    throw new InvalidMinorAmountError(value, 'превышает максимум');
  return parsed;
}

/** Сериализация в проводной формат (строка). */
export function serializeMinorAmount(value: bigint): string {
  return value.toString(10);
}

/**
 * Доля суммы в базисных пунктах с округлением half-up — правило комиссии M-6.
 * 10 000 bps = 100%. Пример: 1000 тийинов × 1250 bps = 125 тийинов;
 * 999 × 1200 = 119.88 → 120 (half-up).
 *
 * Половина (остаток*2 == делитель) округляется ВВЕРХ — в пользу платформы,
 * зафиксировано в M-6 и в снапшоте заказа, поэтому менять нельзя без миграции
 * исторических ожиданий.
 */
export function mulBpsHalfUp(amountMinor: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000)
    throw new InvalidMinorAmountError(bps, 'bps вне диапазона [0, 10000]');
  if (amountMinor < 0n)
    throw new InvalidMinorAmountError(amountMinor, 'отрицательная');
  const numerator = amountMinor * BigInt(bps);
  const quotient = numerator / 10_000n;
  const remainder = numerator % 10_000n;
  return remainder * 2n >= 10_000n ? quotient + 1n : quotient;
}
