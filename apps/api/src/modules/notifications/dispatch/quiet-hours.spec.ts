import {
  PLATFORM_TIMEZONE,
  isWithinQuietHours,
  shiftOutOfQuietHours,
} from './quiet-hours';

// Asia/Tashkent = UTC+5 без DST: 22:00 локали = 17:00 UTC, 08:00 = 03:00 UTC.
describe('quiet hours (OQ-12: платформенные 22:00–08:00, сдвиг на 08:00)', () => {
  describe('границы окна', () => {
    it('21:59 локали — НЕ тихий час, момент не сдвигается', () => {
      const at = new Date('2026-08-01T16:59:00Z'); // 21:59 Ташкент
      expect(isWithinQuietHours(at, PLATFORM_TIMEZONE)).toBe(false);
      expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(at);
    });

    it('22:00 локали — тихий час, сдвиг на 08:00 СЛЕДУЮЩЕГО дня', () => {
      const at = new Date('2026-08-01T17:00:00Z'); // 22:00 Ташкент
      expect(isWithinQuietHours(at, PLATFORM_TIMEZONE)).toBe(true);
      expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(
        new Date('2026-08-02T03:00:00Z'), // 08:00 Ташкент 2 августа
      );
    });

    it('07:59 локали — тихий час, сдвиг на 08:00 ТОГО ЖЕ дня', () => {
      const at = new Date('2026-08-02T02:59:00Z'); // 07:59 Ташкент
      expect(isWithinQuietHours(at, PLATFORM_TIMEZONE)).toBe(true);
      expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(
        new Date('2026-08-02T03:00:00Z'),
      );
    });

    it('08:00 локали — уже НЕ тихий час', () => {
      const at = new Date('2026-08-02T03:00:00Z'); // 08:00 Ташкент
      expect(isWithinQuietHours(at, PLATFORM_TIMEZONE)).toBe(false);
      expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(at);
    });
  });

  it('полночь локали сдвигается на утро того же дня', () => {
    const at = new Date('2026-08-01T19:00:00Z'); // 00:00 Ташкент 2 августа
    expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(
      new Date('2026-08-02T03:00:00Z'),
    );
  });

  it('вечер 31-го числа переносится через границу месяца', () => {
    const at = new Date('2026-07-31T18:30:00Z'); // 23:30 Ташкент 31 июля
    expect(shiftOutOfQuietHours(at, PLATFORM_TIMEZONE)).toEqual(
      new Date('2026-08-01T03:00:00Z'), // 08:00 Ташкент 1 августа
    );
  });
});
