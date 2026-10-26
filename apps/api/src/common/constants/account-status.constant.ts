/**
 * Контакты поддержки и тексты для деактивированных (архивированных) аккаунтов.
 * Показываются при попытке входа архивированного пользователя/организации.
 */
export const PLATFORM_SUPPORT_EMAIL = 'support@eventflow.uz';
export const PLATFORM_SUPPORT_TELEGRAM = 'https://t.me/Khamidullaa';
export const PLATFORM_SUPPORT_PHONE = '+998 93 509 36 36';

const SUPPORT_LINE =
  `Напишите нам на ${PLATFORM_SUPPORT_EMAIL}, и мы поможем восстановить доступ. ` +
  `Также можно связаться: Telegram ${PLATFORM_SUPPORT_TELEGRAM}, тел. ${PLATFORM_SUPPORT_PHONE}.`;

export const ORGANIZATION_DEACTIVATED_MESSAGE =
  `Аккаунт организации деактивирован администратором платформы. ${SUPPORT_LINE}`;

export const USER_DEACTIVATED_MESSAGE =
  `Ваш аккаунт деактивирован администратором платформы. ${SUPPORT_LINE}`;
