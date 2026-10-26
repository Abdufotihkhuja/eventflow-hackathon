import {
  addMonthsUtc,
  calendarMonthKey,
  packMonthIndex,
  packMonthlyKey,
  packPeriodKey,
} from './periods';

describe('Окна потребления (E-11a)', () => {
  it('calendarMonthKey — UTC, с паддингом', () => {
    expect(calendarMonthKey(new Date('2026-07-04T18:00:00Z'))).toBe('2026-07');
    expect(calendarMonthKey(new Date('2026-01-31T23:59:59Z'))).toBe('2026-01');
    // 31 дек 23:00 UTC — ещё декабрь по UTC, даже если локально январь
    expect(calendarMonthKey(new Date('2025-12-31T23:00:00Z'))).toBe('2025-12');
  });

  it('packPeriodKey', () => {
    expect(packPeriodKey('pp-1')).toBe('pack:pp-1');
  });

  describe('addMonthsUtc — кламп дня', () => {
    it('обычный месяц', () => {
      expect(addMonthsUtc(new Date('2026-07-04T10:00:00Z'), 1).toISOString()).toBe(
        '2026-08-04T10:00:00.000Z',
      );
    });
    it('31-е → короткий месяц', () => {
      expect(addMonthsUtc(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe(
        '2026-02-28T00:00:00.000Z',
      );
    });
    it('високосный февраль', () => {
      expect(addMonthsUtc(new Date('2028-01-31T00:00:00Z'), 1).toISOString()).toBe(
        '2028-02-29T00:00:00.000Z',
      );
    });
  });

  describe('packMonthIndex — якорь на активацию (§2.1: 3 окна на 90 дней)', () => {
    const activated = new Date('2026-07-04T12:00:00Z');

    it('первое окно', () => {
      expect(packMonthIndex(activated, new Date('2026-07-04T12:00:00Z'))).toBe(0);
      expect(packMonthIndex(activated, new Date('2026-08-04T11:59:59Z'))).toBe(0);
    });
    it('граница второго окна', () => {
      expect(packMonthIndex(activated, new Date('2026-08-04T12:00:00Z'))).toBe(1);
    });
    it('третье окно и конец 90-дневного пакета', () => {
      expect(packMonthIndex(activated, new Date('2026-09-10T00:00:00Z'))).toBe(2);
      expect(packMonthIndex(activated, new Date('2026-10-01T00:00:00Z'))).toBe(2);
    });
    it('now раньше активации → ошибка', () => {
      expect(() =>
        packMonthIndex(activated, new Date('2026-07-01T00:00:00Z')),
      ).toThrow();
    });
  });

  it('packMonthlyKey собирает ключ', () => {
    const activated = new Date('2026-07-04T12:00:00Z');
    expect(
      packMonthlyKey('pp-1', activated, new Date('2026-08-10T00:00:00Z')),
    ).toBe('pack:pp-1:m1');
  });
});
