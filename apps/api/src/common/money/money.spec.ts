import {
  InvalidMinorAmountError,
  MAX_MINOR_AMOUNT,
  mulBpsHalfUp,
  parseMinorAmount,
  serializeMinorAmount,
} from './money';
import { installBigIntJsonSerialization } from './bigint-json';

describe('parseMinorAmount', () => {
  it('парсит корректные строки', () => {
    expect(parseMinorAmount('0')).toBe(0n);
    expect(parseMinorAmount('1')).toBe(1n);
    expect(parseMinorAmount('59900000')).toBe(59_900_000n);
  });

  it('парсит bigint и safe integer', () => {
    expect(parseMinorAmount(123n)).toBe(123n);
    expect(parseMinorAmount(123)).toBe(123n);
  });

  it.each([
    ['-1', 'знак'],
    ['1.5', 'дробная часть'],
    ['1e6', 'экспонента'],
    ['01', 'ведущий ноль'],
    [' 1', 'пробел'],
    ['', 'пустая строка'],
    ['abc', 'не цифры'],
  ])('отклоняет строку "%s" (%s)', (raw) => {
    expect(() => parseMinorAmount(raw)).toThrow(InvalidMinorAmountError);
  });

  it('отклоняет отрицательные, дробные и небезопасные number', () => {
    expect(() => parseMinorAmount(-1)).toThrow(InvalidMinorAmountError);
    expect(() => parseMinorAmount(1.5)).toThrow(InvalidMinorAmountError);
    expect(() => parseMinorAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      InvalidMinorAmountError,
    );
  });

  it('отклоняет суммы сверх максимума', () => {
    expect(() => parseMinorAmount(MAX_MINOR_AMOUNT + 1n)).toThrow(
      InvalidMinorAmountError,
    );
    expect(parseMinorAmount(MAX_MINOR_AMOUNT)).toBe(MAX_MINOR_AMOUNT);
  });
});

describe('serializeMinorAmount', () => {
  it('сериализует в десятичную строку', () => {
    expect(serializeMinorAmount(0n)).toBe('0');
    expect(serializeMinorAmount(59_900_000n)).toBe('59900000');
  });
});

describe('mulBpsHalfUp (правило комиссии M-6)', () => {
  it('считает точные доли без округления', () => {
    // 12% от 1 000 000 тийинов
    expect(mulBpsHalfUp(1_000_000n, 1200)).toBe(120_000n);
    expect(mulBpsHalfUp(1_000_000n, 0)).toBe(0n);
    expect(mulBpsHalfUp(1_000_000n, 10_000)).toBe(1_000_000n);
  });

  it('округляет half-up на неточных долях', () => {
    // 999 × 1200 / 10000 = 119.88 → 120
    expect(mulBpsHalfUp(999n, 1200)).toBe(120n);
    // 999 × 800 / 10000 = 79.92 → 80
    expect(mulBpsHalfUp(999n, 800)).toBe(80n);
    // 33 × 600 / 10000 = 1.98 → 2
    expect(mulBpsHalfUp(33n, 600)).toBe(2n);
    // 3 × 1200 / 10000 = 0.36 → 0
    expect(mulBpsHalfUp(3n, 1200)).toBe(0n);
  });

  it('ровно половина округляется вверх', () => {
    // 25 × 200 / 10000 = 0.5 → 1
    expect(mulBpsHalfUp(25n, 200)).toBe(1n);
    // 125 × 600 / 10000 = 7.5 → 8
    expect(mulBpsHalfUp(125n, 600)).toBe(8n);
  });

  it('не переполняется на больших суммах', () => {
    expect(mulBpsHalfUp(MAX_MINOR_AMOUNT, 600)).toBe(
      (MAX_MINOR_AMOUNT * 600n) / 10_000n,
    );
  });

  it('отклоняет bps вне [0, 10000] и отрицательные суммы', () => {
    expect(() => mulBpsHalfUp(1n, -1)).toThrow(InvalidMinorAmountError);
    expect(() => mulBpsHalfUp(1n, 10_001)).toThrow(InvalidMinorAmountError);
    expect(() => mulBpsHalfUp(1n, 12.5)).toThrow(InvalidMinorAmountError);
    expect(() => mulBpsHalfUp(-1n, 100)).toThrow(InvalidMinorAmountError);
  });
});

describe('installBigIntJsonSerialization', () => {
  it('делает BigInt сериализуемым в JSON строкой и идемпотентен', () => {
    installBigIntJsonSerialization();
    installBigIntJsonSerialization();
    expect(JSON.stringify({ amountMinor: 59_900_000n })).toBe(
      '{"amountMinor":"59900000"}',
    );
  });
});
