import { PUSH_LOCALES, plural } from './plural';
import { PUSH_MESSAGES, renderPushMessage } from './push-messages';

/**
 * Словарь push.* (BL-11) + PII-политика killed-push (BL-05/OQ-32).
 * Полнота локалей против каталога — в catalog.spec.ts (инвариант №5).
 */

const RENDER_PARAMS = {
  eventTitle: 'Tech Meetup',
  startTime: '18:00',
  holdUntil: '18:15',
  newCount: 2,
  cancelledCount: 1,
  eventsCount: 2,
  totalCount: 21,
  pendingCount: 3,
  seatsLeft: 4,
};

/** Все отрендеренные строки словаря (title+body × все локали). */
function allRenderedTexts(): Array<{ key: string; locale: string; text: string }> {
  const out: Array<{ key: string; locale: string; text: string }> = [];
  for (const key of Object.keys(PUSH_MESSAGES)) {
    for (const locale of PUSH_LOCALES) {
      const rendered = renderPushMessage(key, locale, RENDER_PARAMS);
      if (rendered) {
        out.push({ key, locale, text: `${rendered.title} ${rendered.body}` });
      }
    }
  }
  return out;
}

describe('словарь push.* (BL-11)', () => {
  it('плюрализация ru one/few/many (счётчики регистраций)', () => {
    const forms = {
      ru: {
        one: '# регистрация',
        few: '# регистрации',
        many: '# регистраций',
        other: '# регистраций',
      },
      uz: { other: "# ta ro'yxatdan o'tish" },
      en: { one: '# registration', other: '# registrations' },
    };
    expect(plural('ru', 1, forms)).toBe('1 регистрация');
    expect(plural('ru', 3, forms)).toBe('3 регистрации');
    expect(plural('ru', 11, forms)).toBe('11 регистраций');
    expect(plural('ru', 21, forms)).toBe('21 регистрация');
    expect(plural('uz', 5, forms)).toBe("5 ta ro'yxatdan o'tish");
    expect(plural('en', 1, forms)).toBe('1 registration');
    expect(plural('en', 2, forms)).toBe('2 registrations');
  });

  it('дайджест REG-22 per-account (OQ-23) плюрализуется и опускает нулевые отмены', () => {
    const withCancels = renderPushMessage('push.org.dailyDigest', 'ru', {
      newCount: 5,
      cancelledCount: 2,
      eventsCount: 3,
    });
    expect(withCancels?.body).toBe(
      'За сутки: 5 новых регистраций, 2 отмены по 3 событиям.',
    );

    const withoutCancels = renderPushMessage('push.org.dailyDigest', 'ru', {
      newCount: 1,
      cancelledCount: 0,
      eventsCount: 1,
    });
    expect(withoutCancels?.body).toBe(
      'За сутки: 1 новая регистрация по 1 событию.',
    );
  });

  it('итог закрытия CLS-03 включает pending-блок только при pendingCount>0', () => {
    const withPending = renderPushMessage('push.cls.orgSummary', 'ru', {
      eventTitle: 'Expo',
      totalCount: 21,
      pendingCount: 2,
    });
    expect(withPending?.body).toBe(
      '«Expo»: 21 регистрация. 2 заявки ждут решения.',
    );
    const withoutPending = renderPushMessage('push.cls.orgSummary', 'ru', {
      eventTitle: 'Expo',
      totalCount: 7,
      pendingCount: 0,
    });
    expect(withoutPending?.body).toBe('«Expo»: 7 регистраций.');
  });

  it('неизвестная локаль падает на ru, неизвестный ключ → null', () => {
    const rendered = renderPushMessage('push.reg.approved', 'de', {
      eventTitle: 'X',
    });
    expect(rendered?.title).toBe('Заявка одобрена');
    expect(renderPushMessage('push.unknown.key', 'ru')).toBeNull();
  });

  describe('контент-контракт текстов (BL-05/OQ-32)', () => {
    const rendered = allRenderedTexts();

    it('без эмодзи (консистентно с письмами)', () => {
      for (const { key, locale, text } of rendered) {
        expect({
          key,
          locale,
          hasEmoji: /\p{Extended_Pictographic}/u.test(text),
        }).toEqual({ key, locale, hasEmoji: false });
      }
    });

    it('без денежных сумм и валют (OQ-32: суммы — на экране по тапу)', () => {
      const moneyRe =
        /\b(UZS|so'?m|сум[а-я]*|amount|\d[\d\s]{2,}\s?(uzs|сум))\b/iu;
      for (const { key, locale, text } of rendered) {
        expect({ key, locale, hasMoney: moneyRe.test(text) }).toEqual({
          key,
          locale,
          hasMoney: false,
        });
      }
    });

    it('без плейсхолдеров ФИО третьих лиц (OQ-32)', () => {
      const piiParams =
        /\{(firstName|lastName|fullName|userName|participantName|memberName|attendeeName)\}/;
      for (const key of Object.keys(PUSH_MESSAGES)) {
        for (const locale of PUSH_LOCALES) {
          const forms = PUSH_MESSAGES[key][locale];
          const raw = [forms.title, forms.body]
            .filter((t): t is string => typeof t === 'string')
            .join(' ');
          expect({ key, locale, hasPii: piiParams.test(raw) }).toEqual({
            key,
            locale,
            hasPii: false,
          });
        }
      }
    });
  });
});
