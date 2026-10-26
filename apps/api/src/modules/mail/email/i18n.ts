import type { Locale } from './types';

/**
 * Shared "chrome" copy reused by the layout across every email.
 * Template-specific copy lives in each template builder.
 * Uzbek is Latin script.
 */
interface ChromeStrings {
  ctaFallback: string;
  autoNotice: string;
  supportTitle: string;
  supportBody: (email: string) => string;
  rightsReserved: (year: number) => string;
  addressedTo: (email: string) => string;
  unsubscribe: string;
}

const dict: Record<Locale, ChromeStrings> = {
  ru: {
    ctaFallback:
      'Если кнопка не открывается, скопируйте эту ссылку в адресную строку браузера:',
    autoNotice:
      'Это автоматическое письмо. Пожалуйста, не отвечайте на него.',
    supportTitle: 'Нужна помощь?',
    supportBody: (email) => `Напишите нам: ${email}`,
    rightsReserved: (year) => `© ${year} EventFlow. Все права защищены.`,
    addressedTo: (email) => `Письмо отправлено для ${email}.`,
    unsubscribe: 'Отписаться от подобных писем',
  },
  en: {
    ctaFallback:
      "If the button doesn't open, copy this link into your browser's address bar:",
    autoNotice: 'This is an automated message. Please do not reply to it.',
    supportTitle: 'Need help?',
    supportBody: (email) => `Contact us at ${email}`,
    rightsReserved: (year) => `© ${year} EventFlow. All rights reserved.`,
    addressedTo: (email) => `This message was sent to ${email}.`,
    unsubscribe: 'Unsubscribe from emails like this',
  },
  uz: {
    ctaFallback:
      "Agar tugma ochilmasa, ushbu havolani brauzer manzil satriga nusxalang:",
    autoNotice:
      'Bu avtomatik xabar. Iltimos, unga javob bermang.',
    supportTitle: 'Yordam kerakmi?',
    supportBody: (email) => `Bizga yozing: ${email}`,
    rightsReserved: (year) => `© ${year} EventFlow. Barcha huquqlar himoyalangan.`,
    addressedTo: (email) => `Ushbu xabar ${email} manziliga yuborildi.`,
    unsubscribe: 'Bunday xatlardan obunani bekor qilish',
  },
};

export function chrome(locale: Locale): ChromeStrings {
  return dict[locale] ?? dict.ru;
}

/** Picks a localized string from a per-locale record with a safe fallback. */
export function pick<T>(locale: Locale, map: Record<Locale, T>): T {
  return map[locale] ?? map.ru;
}
