import { SetMetadata } from '@nestjs/common';

export const SKIP_COOKIE_CSRF_KEY = 'skipCookieCsrf';

/**
 * Снимает double-submit проверку CSRF-токена с эндпоинтов, которые web-сессию
 * создают или уничтожают (login/register/refresh/logout).
 *
 * Токен принадлежит той сессии, которую такой запрос как раз и заменяет, так
 * что требовать его — значит запереть пользователя: протухшая кука с соседнего
 * хоста делала бы 403 и на логин, и на выход, а почистить её из браузера
 * нельзя — куки `__Host-` host-only на домене API.
 *
 * Проверка Origin остаётся: она и защищает эти эндпоинты от login-CSRF.
 */
export const SkipCookieCsrf = () => SetMetadata(SKIP_COOKIE_CSRF_KEY, true);
