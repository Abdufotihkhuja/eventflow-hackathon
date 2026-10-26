import {
  DEFAULT_PUSH_LOCALE,
  PushLocale,
  normalizePushLocale,
  plural,
} from './plural';

/**
 * Серверный словарь push.* — ru/uz/en (BL-11).
 *
 * Локаль killed-push резолвится сендером: DeviceToken.locale → Account.locale
 * → 'ru' (DATA_MODEL_DELTA §6). Ключи — колонка «i18n ключи» каталога;
 * полнота ru/uz/en держится CI-инвариантом №5 (catalog.spec.ts).
 *
 * Контент-контракт (BL-05/OQ-32): без эмодзи; без ФИО третьих лиц; без
 * денежных сумм (суммы — на экране по тапу); название события и статус —
 * допустимы. Соответствие проверяется тестами push-messages.spec.ts.
 *
 * Формат совместим с будущим переносом в `packages/i18n` (BL-53): статические
 * шаблоны `{param}` + функции для счётчиков (плюрализация plural(), ru
 * one/few/many).
 */

export type PushParams = Record<string, string | number>;

type TextTemplate = string | ((params: PushParams) => string);

export interface PushMessageForms {
  title: TextTemplate;
  body: TextTemplate;
}

export type PushMessageEntry = Record<PushLocale, PushMessageForms>;

const REGISTRATIONS_NEW = {
  ru: {
    one: '# новая регистрация',
    few: '# новые регистрации',
    many: '# новых регистраций',
    other: '# новых регистраций',
  },
  uz: { other: "# ta yangi ro'yxatdan o'tish" },
  en: { one: '# new registration', other: '# new registrations' },
} as const;

const REGISTRATIONS_TOTAL = {
  ru: {
    one: '# регистрация',
    few: '# регистрации',
    many: '# регистраций',
    other: '# регистраций',
  },
  uz: { other: "# ta ro'yxatdan o'tish" },
  en: { one: '# registration', other: '# registrations' },
} as const;

const CANCELLATIONS = {
  ru: { one: '# отмена', few: '# отмены', many: '# отмен', other: '# отмен' },
  uz: { other: '# ta bekor qilish' },
  en: { one: '# cancellation', other: '# cancellations' },
} as const;

const SEATS_LEFT = {
  ru: { one: '# место', few: '# места', many: '# мест', other: '# мест' },
  uz: { other: '# ta joy' },
  en: { one: '# seat', other: '# seats' },
} as const;

const EVENTS_COUNT = {
  ru: {
    one: '# событию',
    few: '# событиям',
    many: '# событиям',
    other: '# событиям',
  },
  uz: { other: '# ta tadbir' },
  en: { one: '# event', other: '# events' },
} as const;

const PENDING_REQUESTS = {
  ru: {
    one: '# заявка ждёт решения',
    few: '# заявки ждут решения',
    many: '# заявок ждут решения',
    other: '# заявок ждут решения',
  },
  uz: { other: '# ta ariza qaror kutmoqda' },
  en: { one: '# request awaits review', other: '# requests await review' },
} as const;

function num(params: PushParams, key: string): number {
  const value = params[key];
  return typeof value === 'number' ? value : Number(value ?? 0) || 0;
}

export const PUSH_MESSAGES: Record<string, PushMessageEntry> = {
  // ── MOD ────────────────────────────────────────────────────────────────────
  'push.mod.submitted': {
    ru: {
      title: 'Событие на модерации',
      body: '«{eventTitle}» отправлено на проверку. Мы сообщим о решении.',
    },
    uz: {
      title: 'Tadbir moderatsiyada',
      body: '"{eventTitle}" tekshiruvga yuborildi. Qaror haqida xabar beramiz.',
    },
    en: {
      title: 'Event submitted for review',
      body: '"{eventTitle}" was submitted for review. We will let you know the decision.',
    },
  },
  'push.mod.rejected': {
    ru: {
      title: 'Событие отклонено',
      body: '«{eventTitle}» отклонено модерацией. Причина — в карточке события.',
    },
    uz: {
      title: 'Tadbir rad etildi',
      body: '"{eventTitle}" moderatsiyadan o\'tmadi. Sababi tadbir sahifasida.',
    },
    en: {
      title: 'Event rejected',
      body: '"{eventTitle}" was rejected by moderation. See the reason on the event page.',
    },
  },
  'push.mod.changesRequested': {
    ru: {
      title: 'Запрошены правки',
      body: 'По «{eventTitle}» запрошены правки. Замечания — в карточке события.',
    },
    uz: {
      title: "Tuzatishlar so'raldi",
      body: '"{eventTitle}" bo\'yicha tuzatishlar so\'raldi. Izohlar tadbir sahifasida.',
    },
    en: {
      title: 'Changes requested',
      body: 'Changes were requested for "{eventTitle}". See the notes on the event page.',
    },
  },
  'push.mod.published': {
    ru: {
      title: 'Событие опубликовано',
      body: '«{eventTitle}» прошло модерацию и опубликовано.',
    },
    uz: {
      title: 'Tadbir chop etildi',
      body: '"{eventTitle}" moderatsiyadan o\'tdi va chop etildi.',
    },
    en: {
      title: 'Event published',
      body: '"{eventTitle}" passed review and is now live.',
    },
  },
  // ── REG (участник) ─────────────────────────────────────────────────────────
  'push.reg.created': {
    ru: {
      title: 'Вы зарегистрированы',
      body: 'Билет на «{eventTitle}» готов. QR-код — в приложении.',
    },
    uz: {
      title: "Ro'yxatdan o'tdingiz",
      body: '"{eventTitle}" uchun chipta tayyor. QR-kod ilovada.',
    },
    en: {
      title: 'You are registered',
      body: 'Your ticket for "{eventTitle}" is ready. The QR code is in the app.',
    },
  },
  'push.reg.pending': {
    ru: {
      title: 'Заявка отправлена',
      body: 'Заявка на «{eventTitle}» ждёт подтверждения организатора.',
    },
    uz: {
      title: 'Ariza yuborildi',
      body: '"{eventTitle}" uchun ariza tashkilotchi tasdig\'ini kutmoqda.',
    },
    en: {
      title: 'Request sent',
      body: 'Your request for "{eventTitle}" is awaiting organizer approval.',
    },
  },
  'push.reg.paymentPending': {
    ru: {
      title: 'Ожидается оплата',
      body: 'Бронь на «{eventTitle}» действует до {holdUntil}. Завершите оплату.',
    },
    uz: {
      title: "To'lov kutilmoqda",
      body: '"{eventTitle}" uchun bron {holdUntil} gacha amal qiladi. To\'lovni yakunlang.',
    },
    en: {
      title: 'Payment pending',
      body: 'Your hold for "{eventTitle}" lasts until {holdUntil}. Complete the payment.',
    },
  },
  'push.reg.paymentReminder': {
    ru: {
      title: 'Бронь скоро истечёт',
      body: 'Бронь на «{eventTitle}» истекает через 5 минут. Завершите оплату.',
    },
    uz: {
      title: 'Bron tugash arafasida',
      body: '"{eventTitle}" uchun bron 5 daqiqada tugaydi. To\'lovni yakunlang.',
    },
    en: {
      title: 'Hold expiring soon',
      body: 'Your hold for "{eventTitle}" expires in 5 minutes. Complete the payment.',
    },
  },
  'push.reg.holdExpired': {
    ru: {
      title: 'Бронь истекла',
      body: 'Бронь на «{eventTitle}» истекла, место освобождено. Можно попробовать снова.',
    },
    uz: {
      title: 'Bron muddati tugadi',
      body: '"{eventTitle}" uchun bron tugadi, joy bo\'shatildi. Qayta urinib ko\'ring.',
    },
    en: {
      title: 'Hold expired',
      body: 'Your hold for "{eventTitle}" expired and the seat was released. You can try again.',
    },
  },
  'push.reg.paymentFailed': {
    ru: {
      title: 'Платёж не прошёл',
      body: 'Оплата за «{eventTitle}» не прошла. Попробуйте ещё раз.',
    },
    uz: {
      title: "To'lov amalga oshmadi",
      body: '"{eventTitle}" uchun to\'lov amalga oshmadi. Qayta urinib ko\'ring.',
    },
    en: {
      title: 'Payment failed',
      body: 'The payment for "{eventTitle}" did not go through. Please try again.',
    },
  },
  'push.reg.approved': {
    ru: {
      title: 'Заявка одобрена',
      body: 'Участие в «{eventTitle}» подтверждено. Билет уже в приложении.',
    },
    uz: {
      title: 'Ariza tasdiqlandi',
      body: '"{eventTitle}" da ishtirok tasdiqlandi. Chipta ilovada.',
    },
    en: {
      title: 'Request approved',
      body: 'Your spot at "{eventTitle}" is confirmed. The ticket is in the app.',
    },
  },
  'push.reg.rejected': {
    ru: {
      title: 'Заявка отклонена',
      body: 'Заявка на «{eventTitle}» отклонена организатором.',
    },
    uz: {
      title: 'Ariza rad etildi',
      body: '"{eventTitle}" uchun ariza tashkilotchi tomonidan rad etildi.',
    },
    en: {
      title: 'Request declined',
      body: 'Your request for "{eventTitle}" was declined by the organizer.',
    },
  },
  'push.reg.ticketIssued': {
    ru: {
      title: 'Билет выдан',
      body: 'Билет на «{eventTitle}» готов. QR-код доступен офлайн.',
    },
    uz: {
      title: 'Chipta berildi',
      body: '"{eventTitle}" uchun chipta tayyor. QR-kod oflayn ishlaydi.',
    },
    en: {
      title: 'Ticket issued',
      body: 'Your ticket for "{eventTitle}" is ready. The QR code works offline.',
    },
  },
  'push.reg.checkedIn': {
    ru: {
      title: 'Вы отмечены',
      body: 'Отметка о посещении «{eventTitle}» получена.',
    },
    uz: {
      title: 'Belgilandingiz',
      body: '"{eventTitle}" ga tashrif belgilandi.',
    },
    en: {
      title: 'Checked in',
      body: 'Your check-in at "{eventTitle}" is confirmed.',
    },
  },
  'push.reg.cancelled': {
    ru: {
      title: 'Участие отменено',
      body: 'Ваше участие в «{eventTitle}» отменено. Подробности — в приложении.',
    },
    uz: {
      title: 'Ishtirok bekor qilindi',
      body: '"{eventTitle}" dagi ishtirokingiz bekor qilindi. Tafsilotlar ilovada.',
    },
    en: {
      title: 'Participation cancelled',
      body: 'Your participation in "{eventTitle}" was cancelled. Details are in the app.',
    },
  },
  'push.reg.revoked': {
    ru: {
      title: 'Подтверждение отозвано',
      body: 'Подтверждение участия в «{eventTitle}» отозвано, заявка снова на рассмотрении.',
    },
    uz: {
      title: 'Tasdiq bekor qilindi',
      body: '"{eventTitle}" uchun tasdiq bekor qilindi, ariza qayta ko\'rilmoqda.',
    },
    en: {
      title: 'Approval revoked',
      body: 'Your approval for "{eventTitle}" was revoked; the request is under review again.',
    },
  },
  'push.reg.refunded': {
    ru: {
      title: 'Возврат оформлен',
      body: 'Возврат по билету на «{eventTitle}» оформлен. Детали — в заказе.',
    },
    uz: {
      title: 'Qaytarish rasmiylashtirildi',
      body: '"{eventTitle}" chiptasi uchun qaytarish rasmiylashtirildi. Tafsilotlar buyurtmada.',
    },
    en: {
      title: 'Refund issued',
      body: 'A refund for your "{eventTitle}" ticket was issued. Details are in the order.',
    },
  },
  // ── REG (организатор) ──────────────────────────────────────────────────────
  'push.org.firstRegistration': {
    ru: {
      title: 'Первая регистрация',
      body: 'На «{eventTitle}» появилась первая регистрация.',
    },
    uz: {
      title: "Birinchi ro'yxatdan o'tish",
      body: '"{eventTitle}" ga birinchi ishtirokchi ro\'yxatdan o\'tdi.',
    },
    en: {
      title: 'First registration',
      body: '"{eventTitle}" just got its first registration.',
    },
  },
  'push.org.capacity50': {
    ru: {
      title: 'Заполнено 50%',
      body: '«{eventTitle}» заполнено наполовину.',
    },
    uz: {
      title: '50% band',
      body: '"{eventTitle}" joylarining yarmi band.',
    },
    en: {
      title: '50% full',
      body: '"{eventTitle}" is half full.',
    },
  },
  'push.org.capacity80': {
    ru: {
      title: 'Заполнено 80%',
      body: '«{eventTitle}» почти заполнено.',
    },
    uz: {
      title: '80% band',
      body: '"{eventTitle}" deyarli to\'ldi.',
    },
    en: {
      title: '80% full',
      body: '"{eventTitle}" is almost full.',
    },
  },
  'push.org.capacity100': {
    ru: {
      title: 'Мест больше нет',
      body: '«{eventTitle}» заполнено полностью.',
    },
    uz: {
      title: 'Joylar tugadi',
      body: '"{eventTitle}" to\'liq band qilindi.',
    },
    en: {
      title: 'No seats left',
      body: '"{eventTitle}" is fully booked.',
    },
  },
  // OQ-23/BL-19: дайджест PER-ACCOUNT — одна сводка по всем событиям
  // организатора (per-event формат = K пушей в 09:00, D-13).
  'push.org.dailyDigest': {
    ru: {
      title: 'Регистрации за сутки',
      body: (p) => {
        const parts = [plural('ru', num(p, 'newCount'), REGISTRATIONS_NEW)];
        if (num(p, 'cancelledCount') > 0) {
          parts.push(plural('ru', num(p, 'cancelledCount'), CANCELLATIONS));
        }
        return `За сутки: ${parts.join(', ')} по ${plural('ru', num(p, 'eventsCount'), EVENTS_COUNT)}.`;
      },
    },
    uz: {
      title: "Kunlik ro'yxatga olishlar",
      body: (p) => {
        const parts = [plural('uz', num(p, 'newCount'), REGISTRATIONS_NEW)];
        if (num(p, 'cancelledCount') > 0) {
          parts.push(plural('uz', num(p, 'cancelledCount'), CANCELLATIONS));
        }
        return `Bir kunda: ${parts.join(', ')} — ${plural('uz', num(p, 'eventsCount'), EVENTS_COUNT)} bo'yicha.`;
      },
    },
    en: {
      title: 'Daily registrations',
      body: (p) => {
        const parts = [plural('en', num(p, 'newCount'), REGISTRATIONS_NEW)];
        if (num(p, 'cancelledCount') > 0) {
          parts.push(plural('en', num(p, 'cancelledCount'), CANCELLATIONS));
        }
        return `Last 24h: ${parts.join(', ')} across ${plural('en', num(p, 'eventsCount'), EVENTS_COUNT)}.`;
      },
    },
  },
  'push.org.refund': {
    ru: {
      title: 'Возврат по билету',
      body: 'По билету на «{eventTitle}» оформлен возврат.',
    },
    uz: {
      title: 'Chipta qaytarildi',
      body: '"{eventTitle}" chiptasi uchun qaytarish rasmiylashtirildi.',
    },
    en: {
      title: 'Ticket refunded',
      body: 'A ticket refund was issued for "{eventTitle}".',
    },
  },
  // ── REM ────────────────────────────────────────────────────────────────────
  'push.rem.event24h': {
    ru: {
      title: 'Завтра: {eventTitle}',
      body: 'Начало {startTime}. Билет с QR-кодом — в приложении.',
    },
    uz: {
      title: 'Ertaga: {eventTitle}',
      body: 'Boshlanishi {startTime}. QR-kodli chipta ilovada.',
    },
    en: {
      title: 'Tomorrow: {eventTitle}',
      body: 'Starts at {startTime}. Your QR ticket is in the app.',
    },
  },
  'push.rem.org24h': {
    ru: {
      title: 'Завтра ваше событие',
      body: '«{eventTitle}» начинается {startTime}. Проверьте готовность: сканер, стойка регистрации.',
    },
    uz: {
      title: 'Ertaga tadbiringiz bor',
      body: '"{eventTitle}" {startTime} da boshlanadi. Tayyorgarlikni tekshiring: skaner, qabul stoli.',
    },
    en: {
      title: 'Your event is tomorrow',
      body: '"{eventTitle}" starts at {startTime}. Check your setup: scanner, check-in desk.',
    },
  },
  'push.rem.online': {
    ru: {
      title: 'Событие начинается',
      body: '«{eventTitle}» начнётся через 10 минут. Подключайтесь.',
    },
    uz: {
      title: 'Tadbir boshlanmoqda',
      body: '"{eventTitle}" 10 daqiqadan so\'ng boshlanadi. Ulanib oling.',
    },
    en: {
      title: 'Starting soon',
      body: '"{eventTitle}" starts in 10 minutes. Join now.',
    },
  },
  // ── CLS ────────────────────────────────────────────────────────────────────
  'push.cls.closing24h': {
    ru: {
      title: 'Регистрация закрывается',
      body: 'Регистрация на «{eventTitle}» закроется через 24 часа.',
    },
    uz: {
      title: "Ro'yxatga olish yopilmoqda",
      body: '"{eventTitle}" uchun ro\'yxatga olish 24 soatdan so\'ng yopiladi.',
    },
    en: {
      title: 'Registration closing',
      body: 'Registration for "{eventTitle}" closes in 24 hours.',
    },
  },
  'push.cls.fewSeats': {
    ru: {
      title: 'Осталось мало мест',
      body: (p) =>
        `На «${p.eventTitle}» осталось ${plural('ru', num(p, 'seatsLeft'), SEATS_LEFT)}.`,
    },
    uz: {
      title: 'Joylar kam qoldi',
      body: (p) =>
        `"${p.eventTitle}" da ${plural('uz', num(p, 'seatsLeft'), SEATS_LEFT)} qoldi.`,
    },
    en: {
      title: 'Few seats left',
      body: (p) =>
        `"${p.eventTitle}" has ${plural('en', num(p, 'seatsLeft'), SEATS_LEFT)} left.`,
    },
  },
  'push.cls.orgSummary': {
    ru: {
      title: 'Регистрация закрыта',
      body: (p) => {
        const base = `«${p.eventTitle}»: ${plural('ru', num(p, 'totalCount'), REGISTRATIONS_TOTAL)}.`;
        const pending = num(p, 'pendingCount');
        return pending > 0
          ? `${base} ${plural('ru', pending, PENDING_REQUESTS)}.`
          : base;
      },
    },
    uz: {
      title: "Ro'yxatga olish yopildi",
      body: (p) => {
        const base = `"${p.eventTitle}": ${plural('uz', num(p, 'totalCount'), REGISTRATIONS_TOTAL)}.`;
        const pending = num(p, 'pendingCount');
        return pending > 0
          ? `${base} ${plural('uz', pending, PENDING_REQUESTS)}.`
          : base;
      },
    },
    en: {
      title: 'Registration closed',
      body: (p) => {
        const base = `"${p.eventTitle}": ${plural('en', num(p, 'totalCount'), REGISTRATIONS_TOTAL)}.`;
        const pending = num(p, 'pendingCount');
        return pending > 0
          ? `${base} ${plural('en', pending, PENDING_REQUESTS)}.`
          : base;
      },
    },
  },
  // ── SUM ────────────────────────────────────────────────────────────────────
  'push.sum.attendee': {
    ru: {
      title: 'Спасибо за участие',
      body: '«{eventTitle}» завершилось. Материалы и сертификат — в приложении.',
    },
    uz: {
      title: 'Ishtirokingiz uchun rahmat',
      body: '"{eventTitle}" yakunlandi. Materiallar va sertifikat ilovada.',
    },
    en: {
      title: 'Thank you for coming',
      body: '"{eventTitle}" has ended. Materials and your certificate are in the app.',
    },
  },
  'push.sum.org': {
    ru: {
      title: 'Событие завершено',
      body: 'Итоги «{eventTitle}» готовы: посещаемость и статистика — в аналитике.',
    },
    uz: {
      title: 'Tadbir yakunlandi',
      body: '"{eventTitle}" yakunlari tayyor: tashrif va statistika analitikada.',
    },
    en: {
      title: 'Event finished',
      body: 'The results for "{eventTitle}" are ready: attendance and stats are in analytics.',
    },
  },
};

function renderTemplate(template: TextTemplate, params: PushParams): string {
  if (typeof template === 'function') {
    return template(params);
  }
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : '',
  );
}

/**
 * Локализованный текст пуша: ключ словаря + подстановки → {title, body}.
 * Неизвестный ключ → null (сендер переведёт доставку в failed, CI такое
 * не пропускает — инвариант №5).
 */
export function renderPushMessage(
  key: string,
  locale: string | null | undefined,
  params: PushParams = {},
): { title: string; body: string } | null {
  const entry = PUSH_MESSAGES[key];
  if (!entry) {
    return null;
  }
  const forms = entry[normalizePushLocale(locale)] ?? entry[DEFAULT_PUSH_LOCALE];
  return {
    title: renderTemplate(forms.title, params),
    body: renderTemplate(forms.body, params),
  };
}
