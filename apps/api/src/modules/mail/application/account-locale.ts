import { DEFAULT_LOCALE, resolveLocale, type Locale } from '../email/types';

/**
 * BL-37 — резолв локали получателя письма: `Account.locale → 'ru'`.
 *
 * Единая точка потребления для ВСЕХ писем: вызывается из
 * {@link MailDispatchService.enqueueTemplateMail}, когда вызывающий не передал
 * `context.locale` сам. Адресация по email, потому что у всех send*-методов
 * MailService получатель известен только адресом:
 *  - User / Organization(owner) / OrganizationMember — их Account после
 *    invite/membership-rework несёт тот же email (`ensureAccountIdentity`
 *    синхронизирует `Account.email` при каждом логине);
 *  - получатель без Account (гость, приглашённый спикер, регистрация без
 *    входа) — дефолт 'ru', текущее де-факто поведение писем.
 *
 * Email не уникален среди Account (legacy-акторы могли породить несколько
 * строк) — берём самую свежую по updatedAt строку с заполненной локалью.
 */

interface AccountLocaleReader {
  account: {
    findFirst(args: {
      where: {
        email: { equals: string; mode: 'insensitive' };
        deletedAt: null;
        locale: { not: null };
      };
      orderBy: { updatedAt: 'desc' };
      select: { locale: true };
    }): Promise<{ locale: string | null } | null>;
  };
}

export async function resolveAccountLocale(
  prisma: AccountLocaleReader,
  email: string,
): Promise<Locale> {
  if (!email || !email.includes('@')) return DEFAULT_LOCALE;
  try {
    const account = await prisma.account.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        deletedAt: null,
        locale: { not: null },
      },
      orderBy: { updatedAt: 'desc' },
      select: { locale: true },
    });
    return resolveLocale(account?.locale);
  } catch {
    // Сбой чтения локали не должен блокировать отправку письма.
    return DEFAULT_LOCALE;
  }
}
