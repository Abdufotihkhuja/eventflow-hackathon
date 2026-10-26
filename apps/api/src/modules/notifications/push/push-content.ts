/**
 * Контент-контракт пуша (BL-05, гэп coverage 1.3).
 *
 * Применяется ПОСЛЕ сборки локализованной строки (словарь push.*):
 * - title/body: без эмодзи (консистентно с письмами), схлопнутые пробелы,
 *   обрезка с многоточием по лимитам ниже;
 * - data-payload: строки ≤ 256 символов, суммарный размер ≤ 4 KB — обязательные
 *   поля deep link ({route, params, channel}) сохраняются, необязательные
 *   отбрасываются от больших к меньшим, пока payload не влезет;
 * - PII-политика killed-push (OQ-32): без ФИО третьих лиц и денежных сумм —
 *   контракт держится на уровне ТЕКСТОВ словаря и проверяется тестами
 *   push-messages.spec.ts (здесь не фильтруется: сервер не отличит имя от
 *   названия события).
 */

/** Лимит title: видимая часть iOS/Android без разворота (~1 строка). */
export const PUSH_TITLE_MAX_CHARS = 64;
/** Лимит body: iOS обрезает ~178 символов в свёрнутом виде. */
export const PUSH_BODY_MAX_CHARS = 178;
export const PUSH_DATA_STRING_MAX_CHARS = 256;
export const PUSH_PAYLOAD_MAX_BYTES = 4096;

const ELLIPSIS = '…';

/** Обязательные поля контракта payload мобилки: {route, params, channel}. */
const REQUIRED_DATA_KEYS = new Set(['route', 'params', 'channel']);

const EMOJI_RE = /\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu;
// eslint-disable-next-line no-control-regex -- вычистка управляющих символов и есть цель
const CONTROL_RE = /[\u0000-\u001f\u007f]/g;

export function truncateWithEllipsis(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}${ELLIPSIS}`;
}

/** Санитайз текста пуша: без эмодзи/управляющих, один пробел, обрезка. */
export function sanitizePushText(
  text: string,
  maxChars: number,
): string {
  const cleaned = text
    .replace(EMOJI_RE, '')
    .replace(CONTROL_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return truncateWithEllipsis(cleaned, maxChars);
}

export interface SanitizedPushContent {
  title: string;
  body: string;
}

export function sanitizePushContent(
  title: string,
  body: string,
): SanitizedPushContent {
  return {
    title: sanitizePushText(title, PUSH_TITLE_MAX_CHARS),
    body: sanitizePushText(body, PUSH_BODY_MAX_CHARS),
  };
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');
}

function clampStrings(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > PUSH_DATA_STRING_MAX_CHARS
      ? truncateWithEllipsis(value, PUSH_DATA_STRING_MAX_CHARS)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map(clampStrings);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        clampStrings(v),
      ]),
    );
  }
  return value;
}

export interface BuildPushDataResult {
  data: Record<string, unknown>;
  /** Отброшенные необязательные поля (диагностика). */
  droppedKeys: string[];
}

/**
 * Data-плечо пуша по контракту: строки ≤256, payload ≤4KB. Обязательные ключи
 * deep link не отбрасываются никогда; необязательные удаляются от самых
 * тяжёлых, пока не влезет.
 */
export function buildPushData(
  data: Record<string, unknown>,
): BuildPushDataResult {
  const clamped = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, clampStrings(value)]),
  );
  const droppedKeys: string[] = [];

  if (byteLength(clamped) <= PUSH_PAYLOAD_MAX_BYTES) {
    return { data: clamped, droppedKeys };
  }

  const optionalBySize = Object.keys(clamped)
    .filter((key) => !REQUIRED_DATA_KEYS.has(key))
    .sort((a, b) => byteLength(clamped[b]) - byteLength(clamped[a]));

  for (const key of optionalBySize) {
    delete clamped[key];
    droppedKeys.push(key);
    if (byteLength(clamped) <= PUSH_PAYLOAD_MAX_BYTES) {
      break;
    }
  }
  return { data: clamped, droppedKeys };
}
