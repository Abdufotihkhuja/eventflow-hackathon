import {
  PUSH_BODY_MAX_CHARS,
  PUSH_DATA_STRING_MAX_CHARS,
  PUSH_PAYLOAD_MAX_BYTES,
  PUSH_TITLE_MAX_CHARS,
  buildPushData,
  sanitizePushContent,
  sanitizePushText,
  truncateWithEllipsis,
} from './push-content';

describe('контент-контракт пуша (BL-05)', () => {
  describe('обрезка title/body с многоточием', () => {
    it('короткий текст не трогается', () => {
      expect(truncateWithEllipsis('Привет', 10)).toBe('Привет');
    });

    it('длинный текст обрезается по лимиту с многоточием', () => {
      const long = 'а'.repeat(200);
      const title = sanitizePushText(long, PUSH_TITLE_MAX_CHARS);
      expect(title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX_CHARS);
      expect(title.endsWith('…')).toBe(true);

      const body = sanitizePushText(long, PUSH_BODY_MAX_CHARS);
      expect(body.length).toBeLessThanOrEqual(PUSH_BODY_MAX_CHARS);
      expect(body.endsWith('…')).toBe(true);
    });

    it('обрезка происходит ПОСЛЕ сборки локализованной строки (санитайз целиком)', () => {
      const { title, body } = sanitizePushContent(
        `Очень длинное название события ${'x'.repeat(100)}`,
        `Тело ${'y'.repeat(300)}`,
      );
      expect(title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX_CHARS);
      expect(body.length).toBeLessThanOrEqual(PUSH_BODY_MAX_CHARS);
    });
  });

  describe('политика эмодзи и мусорных символов', () => {
    it('эмодзи вырезаются, пробелы схлопываются', () => {
      expect(sanitizePushText('Билет 🎉 готов ✅', 100)).toBe('Билет готов');
      expect(sanitizePushText('Строка\n с\tпереносами', 100)).toBe(
        'Строка с переносами',
      );
    });
  });

  describe('лимиты data-payload', () => {
    it('строки payload обрезаются до 256 символов', () => {
      const { data } = buildPushData({
        route: '/event/[id]',
        params: { id: 'e-1' },
        channel: 'updates',
        note: 'n'.repeat(500),
      });
      expect((data.note as string).length).toBeLessThanOrEqual(
        PUSH_DATA_STRING_MAX_CHARS,
      );
      expect((data.note as string).endsWith('…')).toBe(true);
    });

    it('payload >4KB: необязательные поля отбрасываются, deep link выживает', () => {
      const { data, droppedKeys } = buildPushData({
        route: '/event/[id]',
        params: { id: 'e-1' },
        channel: 'transactional',
        // 30 полей по ~250 байт ≈ 7.5KB — заведомо больше лимита
        ...Object.fromEntries(
          Array.from({ length: 30 }, (_, i) => [`extra${i}`, 'x'.repeat(250)]),
        ),
      });
      expect(Buffer.byteLength(JSON.stringify(data))).toBeLessThanOrEqual(
        PUSH_PAYLOAD_MAX_BYTES,
      );
      expect(droppedKeys.length).toBeGreaterThan(0);
      // Обязательный контракт мобилки {route, params, channel} не отброшен.
      expect(data.route).toBe('/event/[id]');
      expect(data.params).toEqual({ id: 'e-1' });
      expect(data.channel).toBe('transactional');
    });

    it('payload в лимите проходит без изменений', () => {
      const input = {
        route: '/ticket/[id]',
        params: { id: 'r-1' },
        channel: 'transactional',
      };
      const { data, droppedKeys } = buildPushData(input);
      expect(data).toEqual(input);
      expect(droppedKeys).toEqual([]);
    });
  });
});
