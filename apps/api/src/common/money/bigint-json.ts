/**
 * Глобальная сериализация BigInt → строка в JSON (D-3, string-on-wire).
 *
 * Prisma возвращает `BigInt` для BigInt-колонок, а `JSON.stringify` кидает
 * `TypeError: Do not know how to serialize a BigInt` — без этого патча любой
 * эндпоинт, вернувший денежное поле, падал бы 500-кой. Патч — страховочная
 * сетка уровня процесса: каждое денежное DTO-поле всё равно объявляется
 * строкой в Swagger (`@ApiProperty({ type: String })`), чтобы контракт и
 * рантайм совпадали (инвариант zero-drift).
 *
 * Вызывается один раз в bootstrap (main.ts) ДО обработки первого запроса.
 */
export function installBigIntJsonSerialization(): void {
  const proto = BigInt.prototype as bigint & { toJSON?: () => string };
  if (typeof proto.toJSON === 'function') return; // идемпотентно
  Object.defineProperty(BigInt.prototype, 'toJSON', {
    value(this: bigint): string {
      return this.toString(10);
    },
    writable: false,
    configurable: true,
  });
}
