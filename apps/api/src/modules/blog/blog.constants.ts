/**
 * Константы для модуля блога
 */

/**
 * Средняя скорость чтения (слов в минуту)
 */
export const READING_SPEED_WPM = 200;

/**
 * Максимальная длина заголовка статьи
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Максимальная длина краткого описания
 */
export const MAX_SHORT_DESCRIPTION_LENGTH = 500;

/**
 * Лимит статей по умолчанию
 */
export const DEFAULT_PAGE_LIMIT = 10;

/**
 * Максимальный лимит статей на страницу
 */
export const MAX_PAGE_LIMIT = 50;

/**
 * Максимальная вложенность ответов на комментарий (0 = корень, 4 = 4 уровня внутрь)
 */
export const MAX_COMMENT_REPLY_DEPTH = 4;

/**
 * Сообщения об ошибках
 */
export const BLOG_ERROR_MESSAGES = {
  POST_NOT_FOUND: 'Статья не найдена',
  POST_NOT_PUBLISHED: 'Статья не опубликована',
  NO_ACCESS: 'Нет доступа к этой статье',
  ONLY_ORGANIZERS: 'Только организаторы могут управлять статьями блога',
  INVALID_CONTENT: 'Невалидная структура BlockNote документа',
  EMPTY_CONTENT: 'Контент статьи не может быть пустым',
  CANNOT_SUBMIT_DRAFT_ONLY: 'Можно отправить на модерацию только черновик',
  CANNOT_SUBMIT_REJECTED:
    'Нельзя отправить на модерацию отклонённую статью. Сначала отредактируйте её.',
  CANNOT_UNPUBLISH: 'Можно снять с публикации только опубликованную статью',
  CANNOT_EDIT_PENDING:
    'Нельзя редактировать статью пока она на модерации. Дождитесь решения модератора.',
  CANNOT_DELETE_PUBLISHED:
    'Нельзя удалить опубликованную статью. Сначала снимите её с публикации.',
  COMMENTS_DISABLED: 'Комментарии к этой статье отключены',
  MAX_REPLY_DEPTH_EXCEEDED: (max: number) =>
    `Максимальная вложенность комментариев — ${max} уровня`,
  COMMENT_NOT_FOUND: 'Комментарий не найден',
  CANNOT_EDIT_COMMENT: 'Вы можете редактировать только свои комментарии',
  CANNOT_DELETE_COMMENT: 'Вы можете удалять только свои комментарии',
  ALREADY_LIKED: 'Вы уже лайкнули эту статью',
  NOT_LIKED: 'Вы не лайкали эту статью',
  ALREADY_SAVED: 'Статья уже сохранена',
  NOT_SAVED: 'Статья не сохранена',
} as const;
